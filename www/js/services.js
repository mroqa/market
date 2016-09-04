angular.module('yourAppsName.services', [])


.constant('FIREBASE_URL', 'https://vivid-torch-2390.firebaseio.com/')

.factory('encodeURIService', function(){
    return{
      encode: function(string){
        console.log(string);
        return encodeURIComponent(string).replace(/\"/g, "%22").replace(/\ /g, "%20").replace(/[!'()]/g, escape);
      }
    };
})

.service('modalService', function($ionicModal){
    
    this.openModal = function(id){
        var _this = this;
        
        if(id == 1){
            $ionicModal.fromTemplateUrl('templates/search.html', {
            scope: null,
            controller: 'SearchCtrl'
        }).then(function(modal) {
            _this.modal = modal;
            _this.modal.show();
        });
        }
        else if (id == 2){
            $ionicModal.fromTemplateUrl('templates/login.html', {
                scope: null,
                controller: 'LoginSearchCtrl'
            }).then(function(modal) {
                _this.modal = modal;
                _this.modal.show();
        });
        }
        else if (id == 3){
            $ionicModal.fromTemplateUrl('templates/signup.html', {
                scope: null,
                controller: 'LoginSearchCtrl'
            }).then(function(modal) {
                _this.modal = modal;
                _this.modal.show();
        });
        }
    };
    
    this.closeModal = function(){
        var _this = this;
        
        if(!_this.modal) return;
        _this.modal.hide();
        _this.modal.remove();
    };
    
})

.factory('dateService', function($filter){
    var currentDate = function(){
        var d = new Date();
        var date = $filter('date')(d, 'yyyy-MM-dd');
        return date;
    };
    var oneYearAgoDate = function(){
        var d = new Date(new Date().setDate(new Date().getDate() - 365));
        var date = $filter('date')(d, 'yyyy-MM-dd');
        return date;
    };
    
    return{
        currentDate: currentDate,
        oneYearAgoDate: oneYearAgoDate
    };
})

.factory('firebaseRef', function($firebase, FIREBASE_URL){
    var firebaseRef = new Firebase(FIREBASE_URL);
    return firebaseRef;
})

.factory('firebaseUserRef', function(firebaseRef) {
    var userRef = firebaseRef.child('users');
    return userRef;
})

.factory('userService', function($rootScope, firebaseRef, firebaseUserRef, modalService){
    var login = function(user){
        firebaseRef.authWithPassword({
          email    : user.email,
          password : user.password
        }, function(error, authData) {
          if (error) {
            console.log("Login Failed!", error);
          } else {
            $rootScope.currentUser = user;
            modalService.closeModal();
            console.log("Authenticated successfully with payload:", authData);
          }
        });

    };
    
    var signup = function(user){
        firebaseRef.createUser({
          email    : user.email,
          password : user.password
        }, function(error, userData) {
          if (error) {
            console.log("Error creating user:", error);
          } else {
            login(user);
//            console.log("Successfully created user account with uid:", userData.uid);
            firebaseRef.child('emails').push(user.email);
            firebaseUserRef.child(userData.uid).child('stocks').set(stocks);
          }
        });

    };
    
    var updateStocks = function(stocks){
        firebaseUserRef.child(getUser().uid).child('stocks').set(stocks);
    };
    
    var logout = function(){
        firebaseRef.unauth();
        $rootScope.currentUser = '';
    };
    
    var getUser = function(){
      return firebaseRef.getAuth();
    };
    
    if(getUser()){
        $rootScope.currentUser = getUser();
    }
    
    return {
        login: login,
        signup: signup,
        logout: logout,
        updateStocks: updateStocks,
        getUser: getUser
    };
})



.factory('stockDataService', function($q, $http, encodeURIService){
    
    var getDetailsData = function(ticker){
        var deffered = $q.defer(), 
        query = 'select * from yahoo.finance.quotes where symbol IN ("' + ticker + '")',
        url = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIService.encode(query) + '&format=json&env=http://datatables.org/alltables.env'
            
//        console.log(url);
        $http.get(url)
             .success(function(json){
               var jsonData = json.query.results.quote;
             deffered.resolve(jsonData);
       })
         .error(function(error){
             console.log("Details Data Error: " + error);
             deffered.reject();
         });
        return deffered.promise;
        
    };
    
    var getPriceData = function(ticker){
        var deffered = $q.defer(),
        url = "http://finance.yahoo.com/webservice/v1/symbols/" + ticker + "/quote?format=json&view=detail";
        
         $http.get(url)
             .success(function(json){
                var jsonData = json.list.resources[0].resource.fields;
             deffered.resolve(jsonData);
       })
         .error(function(error){
             console.log("*Price Data Error: " + error);
             deffered.reject();
         });
        return deffered.promise;
    };//end function getPriceData
    
    return{
      getDetailsData: getDetailsData,
      getPriceData: getPriceData  
    };
})

.factory('chartDataService', function($q, $http, encodeURIService){
    var getHistoricalData = function(ticker, fromDate, todayDate){
    var deffered = $q.defer(),
    query = 'select * from yahoo.finance.historicaldata where symbol = "' + ticker + '" and startDate = "' + fromDate + '" and endDate = "' + todayDate + '"';
    url = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIService.encode(query) + '&format=json&env=http://datatables.org/alltables.env';
//    console.log(url);
    $http.get(url)
        .success(function(json){
         var jsonData = json.query.results.quote;
        
        var volumeData = [],
            priceData = [];
         
         jsonData.forEach(function(dayDataObject){
             var dateToMillis = dayDataObject.Date,
             date = Date.parse(dateToMillis),
             price = parseFloat(Math.round(dayDataObject.Close * 100) / 100).toFixed(3),
             volume = dayDataObject.Volume,
             
             volumeDatum = '['+ date + ',' + volume +']',
             priceDatum = '['+ date + ',' + price +']';
             
//             console.log(volumeDatum,priceDatum);
             
             volumeData.unshift(volumeDatum);
             priceData.unshift(priceDatum);
             });
             
             var formattedChartData =
                 '[{' +
                 '"key":' + '"volume",' +
                 '"bar":' + 'true,' +
                 '"values":' + '[' + volumeData + ']' +
                 '},' +
                 '{' +
                 '"key":' + '"' + ticker + '",' +
                 '"values":' + '[' + priceData + ']' +
                 '}]';
//             console.log(formattedChartData);
             deffered.resolve(formattedChartData);
    })
    .error(function(error){
        console.log("Chart Data Error" + error);
        reffered.reject();
    });
        
    return deffered.promise;
    };
    
    return{
        getHistoricalData: getHistoricalData
    };
})

.factory('notesService', function(){
    var notes = angular.fromJson(window.localStorage['notes'] || '[]');
	function persist(){
		window.localStorage['notes'] = angular.toJson(notes);
	};
	
	return {
		getNotes: function(ticker) {
			return notes;
		},
		addNote: function(ticker, note){
			notes.push(note);
			persist();
		},
		deleteNote: function(index){
            notes.splice(index, 1);
            persist();
            return;
		}
	};
})


.factory('searchService', function($q, $http) {
    return{
        search: function(query){
            var deferred = $q.defer(),
            url = 'http://d.yimg.com/autoc.finance.yahoo.com/autoc?query=' + query + '&region=CA&lang=en-CA&callback=YAHOO.Finance.SymbolSuggest.ssCallback';
            
            YAHOO = window.YAHOO = {
                Finance: {
                    SymbolSuggest: {}
                }
            };
            
            YAHOO.Finance.SymbolSuggest.ssCallback = function(data) {
                var jsonData = data.ResultSet.Result;
                deferred.resolve(jsonData);
            };
            
            $http.jsonp(url)
                .then(YAHOO.Finance.SymbolSuggest.ssCallback);
            
            return deferred.promise;
        }
    };
})

;
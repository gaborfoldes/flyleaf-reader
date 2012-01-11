/* Author:

*/

$(function(){

// super global
if(jQuery.browser.msie == true && jQuery.browser.version != "9.0"){ 
	var msie = true;
} else { 
	var msie = false;
}



function signUpFormWinning() {
	var open = false;
	var valid = false;
//	if($('#sign-up-form').prev().hasClass('clearfix')){
//		$('#sign-up-form').addClass('stick-to-footer');
//	}

//	$('#free-trial-button-container a').click(function(){ return false; });

	// Hover over the form to change it yellow.
		$('#sign-up-form').mouseenter(function() {
			if(open == false) {
				$('#ghost-background').animate({ opacity: '0' },'fast');
				if(msie == true){
					$('#create-my-flyleaf').css({ 'display': 'none' });	
				} else {
					$('#create-my-flyleaf').animate({ opacity: '0' },75);
				}
			}
		}).mouseleave(function() {			
			if(open == false) {
				$('#ghost-background').animate({ opacity: '1' },'fast');
				if(msie == true){
					$('#create-my-flyleaf').css({ 'display': 'block' });	
				} else {
					$('#create-my-flyleaf').animate({ opacity: '1' },75);
				}
			}
		});		

	// You clicked Create My flyleaf. Nice enthusiasm!
	$('#form-top input[type="button"]').mouseup(function(){
		if(open == false){
			scrollToForm();
			openForm();
		} else {
			scrollToForm();
			// Did you fill it out? 
			validateInsertTalktoapp($('#create-flyleaf'));
		}
			return false;
	});

	$('#free-trial-button-container a').click(function(){
		if(open == false){
			$('#ghost-background').animate({ opacity: '0' },'fast');
			if(msie == true){
				$('#create-my-flyleaf, #create-my-flyleaf-active').css({ 'display': 'none' });
			} else {
				$('#create-my-flyleaf').animate({ opacity: '0' },75);
			}
			scrollToForm();
			openForm(); 
		} else {
			scrollToForm();
		}
	});

	// OMG, you touched the form! Let's open it!
	$('#form-top input[type="text"], #form-top input[type="email"]').focus(function(){
		if(open == false){
			scrollToForm();
			openForm();
		}
	});

	$('#user-select input[name="usertype"]').change(function(){
	    var checked = $('#user-select input[name="usertype"]:checked').val();
        $('.user_read').hide();
        $('.user_auth').hide();
        if (checked == 'user_read') {
            $('#fullname').attr('placeholder', 'Full Name');
            $('#username').attr('placeholder', 'Username');
        }
        if (checked == 'user_auth') {
            $('#fullname').attr('placeholder', 'Full Name or Pen Name');
            $('#username').attr('placeholder', 'Sitename / Username');
        }
        $('.' + checked).show();
	});

	
	// Wuuut, you want to close the form? Fine.
	$('#closeMe').click(function(){
		if(open == true){
			open = false;
			$('#create-flyleaf, #ghost-background, #active-background').animate({
				    height: '30px',
				paddingTop: '5px',
				paddingRight: '5px',
				paddingBottom: '5px',
				paddingLeft: '5px'
			  }, 'slow', function() {
				open = false;
				$('#form-bottom').addClass('hidden');
			});

			$('#closeMe').fadeOut('fast');

			$('#sign-up-form').animate({
			    height: '65px'
			  }, 'slow', function() {
			    // Animation complete.
			});	

			if(msie == true){
				$('#create-my-flyleaf, #create-my-flyleaf-active, #create-my-flyleaf-click').css({'top':'3px', 'right':'10px'});	
			} else {
				$('#create-my-flyleaf, #create-my-flyleaf-active, #create-my-flyleaf-click').animate({
					top: '6px',
					right: '5px'
				  }, 'slow',function(){
					// animation complete
				});
			}
			
			return false;
		}
	});

	// hoverin' and clickin' on the new flyleaf 'lets go!' buttons.
	$('#signup-button, .try-button, #try-flyleaf-free-translate').click(function(){
		if(open == false){
			$('#ghost-background').animate({ opacity: '0' },'fast');
			$('#create-my-flyleaf').animate({ opacity: '0' },75);
			$('#create-my-flyleaf-active').animate({ opacity: '1' },75);
			scrollToForm();
			openForm(); 
		} else {
			scrollToForm();
		}
		return false;
	});
  
	function scrollToForm(){
		if($('#sign-up-form').prev().hasClass('clearfix')){
			$("html, body").animate({ scrollTop: $(document).height() }, "fast" );
		} else {
			$("html, body").animate({ scrollTop: 0 }, "fast" );
		}
	}	
	
	function openForm(){
	
		if(open == false){
			open = true;
	
			$('#create-flyleaf, #ghost-background, #active-background').animate({
			    height: '192px',
				paddingTop: '5px',
				paddingRight: '5px',
				paddingBottom: '5px',
				paddingLeft: '5px'	
			  }, 'fast', function() {
			});
	
			$('#closeMe').fadeIn('fast');
	
			$('#sign-up-form').animate({
			    height: '255px'
			  }, 'fast', function() {
			    // Animation complete.
			});
	
			$('#create-my-flyleaf,#create-my-flyleaf-active, #create-my-flyleaf-click').animate({
				top: '166px',
				right: '5px'
			  }, 'fast',function(){
				// animation complete
			});
	
			// animate #create-flyleaf sliding down.
			$('#form-bottom').removeClass('hidden');			
	
		}
	}
	
	$("input#company_name").blur(function () {
    	domainTextField = $("input#site_address");
    	if (domainTextField.attr("value").length == 0) {
      		domainTextField.attr("value", $(this).attr("value").toLowerCase().replace(/\W/g, ''));
    	}
	});
	
	function validateInsertTalktoapp(form){
		if($('#terms').attr('checked') != 'checked'){
			$('.shake').effect("shake", { times:2, distance:5, direction:"right" }, 100);
		} else {
			//insertTimeZoneIntoForm(form);
			//insertSourceIntoForm(form);
			//insertCountryCodeIntoForm(form);
			//insertEmptyPhoneNumberIntoForm(form);
	
			//var queryString = form.formSerialize();
			//var domain = jQuery.url.setUrl(document.location).attr("host").split(".").splice(1,2).join(".");
			
			//$.getJSON("http://signup.flyleaf.com/accounts.json?_method=post&callback=?", queryString, processSignupResponse);
			$('#create-my-flyleaf, #create-my-flyleaf-click, #create-my-flyleaf-active').fadeOut('fast');
			$('#loading').fadeIn('fast');

var errorContent = '<div class="errors">';
errorContent += "<p>" + "Nice clicking." + "</p>";
errorContent += "<ul><li>This function is not implemented yet.</li><li>Try again soon.</li>";
errorContent += "</ul></div>";
errorsContainer = $("#instructions");
errorsContainer.html(errorContent);
$('#loading').fadeOut('fast');
$('#create-my-flyleaf, #create-my-flyleaf-click, #create-my-flyleaf-active').fadeIn('fast');

		}
	}

	function processSignupResponse(response) {
		if (response.success) {
			trackSignupSuccess();
			automaticLogin(response);
		} else {
			displayErrorMessages(response);
		}
	}
	
	function trackSignupSuccess() {
		var ToTangoID = 'SP-1111-01';
		var tracker = new __sdr(ToTangoID);
		tracker.track(
			'Submit Form', // activity
			'Signup', // module
				{
					o: $('#company_name').val(), // organization name
					ofid: $('#site_address').val() // organization ID
				},
			$('#full_name').val() // user
		);
	}
	
	function automaticLogin(data) {
		//$("#success").after('<iframe style="display:none;" src="http://www.flyleaf.com/wp-content/themes/flyleaf-twentyeleven/signup_success.html"></iframe>');
		console.log('success loaded');
		setTimeout( function(response) {
			window.location = data.right_away_link;
			}, 2000 
		);
	}
	
	/*function displaySuccessMessage(data) {
		$('#form-top').fadeOut('fast');
		$('#lets-go a').attr("href", data.right_away_link);
		$('#future-access').attr("href", data.right_away_link).html(data.help_desk_link);
		$('#success').fadeIn('fast');
		$('#form-bottom').remove();
		$("#success").after('<iframe style="display:none;" src="http://www.flyleaf.com/wp-content/themes/flyleaf-twentyeleven/signup_success.html"></iframe>');
	}*/
	
	function displayErrorMessages(data) {
		var errorContent = '<div class="errors">';
		errorContent += "<p>" + data/*['message']*/ + "</p>";
		errorContent += "<ul>";
		$.each(data.errors, function (indexInArray, valueOfElement) {
			errorContent += "<li>" + valueOfElement + "</li>";
		});
		errorContent += "</ul></div>";
		errorsContainer = $("#instructions");
		errorsContainer.html(errorContent);
		$('#loading').fadeOut('fast');
		$('#create-my-flyleaf, #create-my-flyleaf-click, #create-my-flyleaf-active').fadeIn('fast');
	}
	
	function isDST() {
	   var today = new Date();
	   var jan = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
	   var jul = new Date(today.getFullYear(), 6, 1, 0, 0, 0, 0);
	   var temp = jan.toGMTString();
	   var jan_local = new Date(temp.substring(0, temp.lastIndexOf(" ")-1));
	   var temp = jul.toGMTString();
	   var jul_local = new Date(temp.substring(0, temp.lastIndexOf(" ")-1));
	   var hoursDiffStdTime = (jan - jan_local) / (1000 * 60 * 60);
	   var hoursDiffDaylightTime = (jul - jul_local) / (1000 * 60 * 60);
	
	   return hoursDiffDaylightTime != hoursDiffStdTime;
	}
	
	function insertTimeZoneIntoForm(formElement) {
	  var timeZoneOffset = (new Date()).getTimezoneOffset() / 60 * (-1);
	  timeZoneOffset -= (isDST() ? 1 : 0);
	
	  if ($("input[name='account[utc_offset]']").length == 0) {
	    formElement.prepend('<input type="hidden" name="account[utc_offset]" value="' + timeZoneOffset + '" />');
	  }
	}
	
	function insertSourceIntoForm(formElement) {
	  var source = $.cookie("_website_referrer");
	  
	  if (source != null) {
	    if ($("input[name='account[source]']").length == 0) {
	      formElement.prepend('<input type="hidden" name="account[source]" value="' + source + '" />');
	    }
	  }
	}
	
	function insertCountryCodeIntoForm(formElement) {
	  if (google.loader.ClientLocation && google.loader.ClientLocation.address) {
	    var countryCode = google.loader.ClientLocation.address.country_code;
	    
	    if ($("input[name='address[country_code]']").length == 0) {
	      formElement.prepend('<input type="hidden" name="address[country_code]" value="' + countryCode + '" />');
	    }
	  }
	}
	
	function insertEmptyPhoneNumberIntoForm() {
	  if ($('#phone').val() == "") {
	    $('#phone').val('-');
	  }
	}
	
	function getUrlVars() {
	    var vars = [], hash;
	    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
	    for(var i = 0; i < hashes.length; i++)
	    {
	        hash = hashes[i].split('=');
	        vars.push(hash[0]);
	        vars[hash[0]] = hash[1];
	    }
	    return vars;
	}


} // end 


signUpFormWinning();


}); 



define(["jquery", "lib/underscore", "lib/jquery.cookie", "lib/jssha-sha1"], function($) {

var SwiftClient = function() { 
	var that = {
		'authorize_url': '/auth/v1.0'
	};

	that._load_from_cookie = function(validation_url) {
		var token = $.cookie('swift_auth_token');
		if (token != null) {
			if (that._validate_token(token, validation_url)) {
				that.storage_url = $.cookie('swift_storage_url'); 
				that.auth_token = $.cookie('swift_auth_token'); 
				that.storage_token = $.cookie('swift_storage_token'); 
				that.account = $.cookie('swift_account'); 
				that.username = $.cookie('swift_username'); 
			} else {
				that._delete_cookies();
			}
		}
	}

	that._save_to_cookie = function() {
		$.cookie('swift_storage_url', that.storage_url, {expires: 7}); 
		$.cookie('swift_auth_token', that.auth_token, {expires: 7}); 
		$.cookie('swift_storage_token', that.storage_token, {expires: 7}); 
		$.cookie('swift_account', that.account, {expires: 7}); 
		$.cookie('swift_username', that.username, {expires: 7}); 
	}

	that._delete_cookies = function() {
		$.cookie('swift_storage_url', null); 
		$.cookie('swift_auth_token', null); 
		$.cookie('swift_storage_token', null); 
		$.cookie('swift_account', null); 
		$.cookie('swift_username', null); 
	}

	that._validate_token = function(token, url) {
		var is_valid = false;
		$.ajax({
			url: url,
			type: "head",
			async: false,
			beforeSend: function(xhr) { xhr.setRequestHeader('X-Auth-Token', token); },
			success: function(data, result, xhr) { is_valid = true; }
		});
		return is_valid;	
	}

	/* Strange ... seems to be returning true for Sam.  Try to reproduce. */
	that.is_authorized = function() {
		return !!that.auth_token;
	}

	that.logout = function() {
		that.storage_url = null; 
		that.auth_token = null; 
		that.storage_token = null; 
		that._delete_cookies();
	}

	that.authorize = function(validation_url) {
		that._load_from_cookie(validation_url);
		var dfr = $.Deferred();

		if (that.is_authorized()) {
			dfr.resolve();
		} else {
			dfr.reject();
		}
		return dfr.promise();
	}

	that.login = function(account, username, password) {
		return $.ajax({
			url: that.authorize_url,
			type: "get",
			dataType: "html",
			error: function(xhr, result, error_thrown) {
				console.log("Could not authorize! " + xhr.status + " : " + xhr.statusText);
			},
			beforeSend: function(xhr) {
				xhr.setRequestHeader('X-Storage-User', account + ':' + username);
				xhr.setRequestHeader('X-Storage-Pass', password);
			},
			success: function(data, result, xhr) {
				that.account = account;
				that.username = username;
				that.storage_url = xhr.getResponseHeader('X-Storage-Url');
				that.auth_token = xhr.getResponseHeader('X-Auth-Token');
				that.storage_token = xhr.getResponseHeader('X-Storage-Token');
				that._save_to_cookie();
			}
		});
	}

	/* TODO: Encode marker? */
	that.list_container = function(container, last_item, num_items) {
		args = "limit=" + num_items;
		if (last_item != null) {
			args += "&marker=" + last_item;
		}

		return $.ajax({
			url: container + '?' + args,
			type: "get",
			dataType: "json",
			error: function(xhr, result, error_thrown) {
				console.log("Could not list container! " + xhr.status + " : " + xhr.statusText);
			},
			beforeSend: function(xhr) {
				xhr.setRequestHeader('X-Auth-Token', that.auth_token);
			}
		});
	};

	/* TODO: extract secret */
	that.temp_url_signature = function(path, redirect, max_size, max_count, expires) {
		var body = [path, redirect, max_size, max_count, expires].join('\n');
    var utf8 = unescape(encodeURIComponent(body));
		var shaObj = new jsSHA(utf8, "ASCII");
		var hmac = shaObj.getHMAC("tempkey", "ASCII", "HEX");
		return hmac;
	};

	return that;
};

return SwiftClient;

});

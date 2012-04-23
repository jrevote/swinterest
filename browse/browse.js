
require(["jquery", "swift", "lib/jquery.cookie", "lib/underscore", "lib/jquery.imagesloaded", "lib/masonry"], function($, SwiftClient) {

	function make_box(img_src) {
		return '<div class="image_box"><img src="' + img_src + '"></div>';
	}

	var SwinterestPage = function(swc) { 
		var that = {
			client: swc, 
      items: [],
			watermark:  0,
      loading: false,
			next_item_name: null,
			masonry_initialized: false
		};

		that.container = $('#content'); 

		that.image_root = function() {
			return '/v1/AUTH_swinterest/images_' + $.cookie('swift_username');
		};

		that.image_path = function(image) {
			return that.image_root() + '/' + image;
		};

		/* TODO:  Can we move the bulk of "next" into an iterator in the swift client? */
		that.next = function() {
			var dfr = that._dfr.pipe(function() { that._display_next_group(15); });
			if (dfr) that._dfr = dfr;
		};

		/* TODO: Change this to return completed dfr...no, currently running dfr if loading.  maybe. 
		 * The idea would be to get rid of the externalized conditionals. */
		that._display_next_group = function(num_images) {
			if (that.loading) return false;
			that.loading = true;

			/* TODO:  Turn off loading if attempt fails */
			var dfr = that._update_with(that.items.slice(that.watermark, that.watermark + num_images));
			dfr.then(function() { 
				that.loading = false; 
				that.watermark += num_images;
			})
			return dfr;
		};

		/* TODO: make this dynamically load when it's out of preloaded data */
		/* TODO: when you do that, don't requery if there's no more data */
		/* TODO: maybe preparse the records to save on memory */
		that.load_and_display = function() {
			that._dfr = that.client.list_container(that.image_root(), that.next_item_name, 2000).pipe(function(data) {
				that.items = data;
				return that._display_next_group(30);
			});
		};

		that._update_with = function(data) {
			var $to_append = $(
					_.chain(data).pluck('name')
						.map(function(img) { return that.image_path(img) })
						.map(function(img_src) { return make_box(img_src); })
						.value().join('')
			);
			that.container.append($to_append);
			var dfr = that._update_masonry($to_append);

			if (data.length) {
				that.next_item_name = _.last(data).name 
			}

			return dfr;
		};

		that._update_masonry = function($updated_elements) {
			var dfr = $.Deferred();
			if (that.masonry_initialized) {
				$updated_elements.imagesLoaded(function() {
					that.container.masonry('appended', $updated_elements, true);
					dfr.resolve();
				});
			} else {
				/* This seems to be reentrant, which is good, because it can take awhile to
				 * fully initialize and this code path can get called again in the interim */
				that.container.imagesLoaded(function(){
					that.container.masonry({
						itemSelector: '.image_box',
						isFitWidth: true,
						columnWidth: 220
					});
					that.masonry_initialized = true
					dfr.resolve();
				});
			}
			return dfr;
		};

		that._clear_login_form = function() {
			$('#login .account-input').val('');
			$('#login .user-input').val('');
			$('#login .password-input').val('');
		}

		that.update_login_display = function() {
			that._clear_login_form();
			if (that.client.is_authorized()) {
				$('#login').hide();
				$('#logout').show();
				$('#upload').show();
			} else {
				$('#login').slideDown('slow');
				$('#logout').hide();
				$('#upload').hide();
			}
		};

		that.clear_page = function() {
			$('#content').empty();
			that.masonry_initialized = false;
			that.watermark = 0;
			that.items = [];
			that.next_item_name = null;
		};

		$('#login-form').submit(function() {
			var account = $('#login .account-input').val();
			var username = $('#login .user-input').val();
			var password = $('#login .password-input').val();
	 		swc.login(account, username, password).then(function() {
				that.update_login_display();
				that.load_and_display();
			});
			return false;
		});

		$('#logout a').click(function() {
			swc.logout();
			that.update_login_display();
			/* TODO:  only call if we've initialized */
			that.container.masonry('destroy');
			that.clear_page();
		});

		that.update_login_display();
		return that;
	};

	var swc = SwiftClient();
	var page = SwinterestPage(swc);
	swc.authorize(page.image_root())
		.then(page.update_login_display)
		.then(page.load_and_display);

	$(window).scroll(function(){
		var proximity = Math.abs($(window).scrollTop() - ($(document).height() - $(window).height())) 
		if (proximity < 100){
			page.next();
		}
	});
});


SwiftStack's workshops are online here:
http://swiftstack.com/training/

This workshop builds on top of the Swift install workshop:
http://swiftstack.com/training/swift-install/

Set your environment variables

[as your demo user, not root]
export ST_AUTH=http://localhost:8080/auth/v1.0
export ST_USER=swinterest:admin
export ST_KEY=password

--

Create accounts (discuss architecture of app)

[Edit /etc/swift/proxy-server.conf on your node]
user_swinterest_admin = password .admin http://localhost:8080/v1/AUTH_swinterest
user_swinterest_jack = password http://localhost:8080/v1/AUTH_swinterest
user_swinterest_diane = password http://localhost:8080/v1/AUTH_swinterest

sudo swift-init proxy restart

--

Upload application code

swift post swinterest
swift upload swinterest *.html browse
swift post -r '.r:*' swinterest

--

Create containers for images

swift post images_jack
swift post images_diane

--

Set ACLs for image containers

swift post -r '.r:*,.rlistings' images_jack
swift post -w 'swinterest:jack' images_jack

swift post -r '.r:*,.rlistings' images_diane
swift post -w 'swinterest:diane' images_diane

--

Configure Staticweb

Edit /etc/swift/proxy-server.conf
Add staticweb after tempauth in pipeline

swift post -m 'web-index:index.html' swinterest
swift post -m 'web-error:error.html' swinterest

--

Configure image upload

Edit /etc/swift/proxy-server.conf

Put formpost in pipeline before tempauth

Put in formpost stanza at bottom:
[filter:formpost]
use = egg:swift#formpost

Then set the temp url key:
swift post -m Temp-URL-Key:tempkey

Restart proxy server:
sudo swift-init proxy restart

--

Upload some of your own sample images directly

swift -U swinterest:jack upload images_jack set1/*
swift -U swinterest:diane upload images_diane set2/*

Or, visit the upload page and drag and drop!

--

Visit the site and try logging in!

http://localhost:8889/v1/AUTH_swinterest/swinterest/index.html

account: swinterest
user: jack
password: password

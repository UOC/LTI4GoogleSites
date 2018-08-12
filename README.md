# LTI4GoogleSites
This is a LTI Tool that allows to launch LTI from Google Sites, first of all you will need to create a new project on https://script.google.com

## How it works
This plugin allows to launch and LTI Provider from Google sites, to do that this tool uses:
* Current user information
* Current page url to map which tool has to launch
* The script properties to store the configuration

## Knowing issues
* To store data uses a custom separators should be change it to JSON string using JSON.stringify and JSON.parse (review where the code uses SEPARATOR_PROPERTIES, SEPARATOR_CUSTOM_PARAMS and SEPARATOR_EACH_CUSTOM_PARAM
* Since 2018 the Google site operation "SitesApp.getActivePage().getUrl()" returns the page where script was created not the current page, then the proposal of this script to be share from many tools doesn't work anymore.

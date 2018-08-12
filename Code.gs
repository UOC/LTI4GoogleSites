/*
 *     LTI4Google Sites - Classes to provide LTI consumer options to Google Sites
 *     Copyright (c) 2015  Antoni Bertran
 *
 *     This program is free software; you can redistribute it and/or modify
 *     it under the terms of the GNU Lesser General Public License as published by
 *     the Free Software Foundation; either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU Lesser General Public License for more details.
 *
 *     You should have received a copy of the GNU Lesser General Public License along
 *     with this program; if not, write to the Free Software Foundation, Inc.,
 *     51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 *     Contact: abertranb@uoc.edu and antoni@tresipunt.com
 *
 */
 
var SEPARATOR_PROPERTIES = '_|_';
var SEPARATOR_CUSTOM_PARAMS = ';;';
var SEPARATOR_EACH_CUSTOM_PARAM = '::';

/** Get the user email*/
function getUser(email) {
  return email;
}

/**
   * parses the url and rebuilds it to be
   * scheme://host/path
   */
function get_normalized_http_url(url) {
  var parts = parse_url(url);
  var port=parts['port'];
  var scheme=parts['scheme'];
  var host=parts['host'];
  var path=parts['path'];
  
  if (!port) {
    port = (scheme == 'https') ? '443' : '80';
  }
  
  if ((scheme=='https' && port!=443)
      || (scheme=='http' && port!=80)){
    host=host+':'+port;  
  }
  return scheme+'://'+host+path;
}
/**
 * just uppercases the http method
 */
function get_normalized_http_method(http_method) {
    return http_method.toUpperCase();
}
/**
   * Returns the base string of this request
   *
   * The base string defined as the method, the url
   * and the parameters (normalized), each urlencoded
   * and the concated with &.
   */
  function get_signature_base_string(http_method, url, params) {
    var parts = [
      get_normalized_http_method(http_method),
      get_normalized_http_url(url),
      get_signable_parameters(params, url)
    ];

    parts = urlencode_rfc3986(parts);

    return implode('&', parts);
  }
/**
   * The request parameters, sorted and concatenated into a normalized string.
   * @return string
   */
  function get_signable_parameters(params, url) {

    // Remove oauth_signature if present
    // Ref: Spec: 9.1.1 ("The oauth_signature parameter MUST be excluded.")
    if (isset(params['oauth_signature'])) {
      unset(params['oauth_signature']);
    }
    
    //Check if there are a query params in the url
    var parts = parse_url(url);
    if (parts['query']) {
      var pairs = explode('&', parts['query']);
      for (i=0; i<pairs.length; i++) {
        var split = explode('=', pairs[i]);
        params[split[0]] = split[1];
/*        key = urlencode_rfc3986(split[0]);
        value = urlencode_rfc3986(split[1]);*/
      }
    }

    return build_http_query(params);
  }

function build_http_query(params) {
    if (!params) return '';

    // Urlencode both keys and values
     params = uksort(params, 'strcmp');
    var keys = urlencode_rfc3986(arrayKeys(params));
    var values = urlencode_rfc3986(arrayValues(params));
    var pairs = array_combine_pairs(keys, values);

    // Parameters are sorted by name, using lexicographical byte value ordering.
    // Ref: Spec: 9.1.1 (1)
    // TODO

    //var pairs = params;
    //TODO order it!
    /*pairs = [];
    params.every(function(value, key, array) {
     Logger.log(param);
//     pairs[] = parameter . '=' . value;
    });*/
    /*foreach (params as parameter => value) {
      if (is_array(value)) {
        // If two or more parameters share the same name, they are sorted by their value
        // Ref: Spec: 9.1.1 (1)
        natsort(value);
        foreach (value as duplicate_value) {
          $pairs[] = parameter . '=' . duplicate_value;
        }
      } else {
        pairs[] = parameter . '=' . value;
      }
    }*/
    // For each parameter, the name is separated from the corresponding value by an '=' character (ASCII code 61)
    // Each name-value pair is separated by an '&' character (ASCII code 38)
    return implode('&', pairs);
}

function urlencode_rfc3986(input) {
  if (is_array(input)) {
    return array_map('urlencode_rfc3986_string', input);
  } else if (is_scalar(input)) {
    return urlencode_rfc3986_string(input);
  } else {
    return '';
  }
}

function urlencode_rfc3986_string(input) {
  return rawurlencode(input).replace('%7E', '~').replace('+','');
}

function getLTIRole(site, lis_person_contact_email_primary){
  var roles='Learner';
  if (isInstructor(site, lis_person_contact_email_primary)) {
        roles='Instructor';
  }
  if (isOwner(site, lis_person_contact_email_primary)) {
        roles='Administrator';
  }
  return roles;
}

function isOwner(current_site, lis_person_contact_email_primary) {
  var is_owner = false;
  try {
    for (i=0; i<current_site.getOwners().length; i++) {
      if (current_site.getOwners()[i]==lis_person_contact_email_primary) {
        is_owner = true;
        break; 
      }
    }
  } catch (e) {
  }
  return is_owner;
}


function isInstructor(current_site, lis_person_contact_email_primary) {
  var is_instructor = false;
  try {
    for (i=0; i<current_site.getEditors().length; i++) {
      if (current_site.getEditors()[i]==lis_person_contact_email_primary) {
        is_instructor = true;
        break; 
      }
    }
  } catch (e) {
  }
  return is_instructor;
}

/**
* Get properties of current page*/ 
function getLTIDataByPage(current_page) {
  Logger.log('Current page: '+current_page);
  var scriptProperties = PropertiesService.getScriptProperties();
  var result = {
    };

  if (scriptProperties!=null) {
    var properties = scriptProperties.getProperty(current_page);
    if (properties!=null) { 
      var splitted_values = properties.split(SEPARATOR_PROPERTIES);
      //6 is the custom parameters
      if (splitted_values.length==5 || splitted_values.length==6) {
        result = {
          url: splitted_values[0],
          oauth_consumer_key: splitted_values[1],
          secret: splitted_values[2],
          debug: splitted_values[3]==1,
          launch_container: splitted_values[4],
          custom_parameters: splitted_values.length==6?splitted_values[5]:'',
        };
      }
    }
  }
  return result;
}


function saveLTIDataByPage(current_page, url, oauth_consumer_key, secret, debug, launch_container, custom_parameters) {
  var prop = PropertiesService.getScriptProperties();
  var result = false;

  if (prop!=null) {
    var value = url+SEPARATOR_PROPERTIES+oauth_consumer_key+SEPARATOR_PROPERTIES+secret+
      SEPARATOR_PROPERTIES+debug+SEPARATOR_PROPERTIES+launch_container+SEPARATOR_PROPERTIES+custom_parameters;
    prop.setProperty(current_page, value);
    result = true;
  }
  return result;
}

/**
* This function stores the data from LTI */
function saveLTIData(e) {

//  var pageurl = e.parameter.siteurl;
  var pageurl = e.parameter.pageurl;
  var page = SitesApp.getPageByUrl(pageurl);
  var site = SitesApp.getSiteByUrl(pageurl);
  var result = {
    };

  if (page!=null && page!=null) {
    if (isOwner(site, Session.getActiveUser().getEmail()) ||
         isInstructor(site, Session.getActiveUser().getEmail()))
      {
      var url = e.parameter.lti_endpoint;
      var oauth_consumer_key = e.parameter.lti_consumerkey;
      var secret = e.parameter.lti_secret;
      var debug = e.parameter.lti_debug;
      var launch_container = e.parameter.lti_launch_container;
      var custom_parameters = e.parameter.lti_custom_parameters;
        
      pageurl = e.parameter.lti_type && e.parameter.lti_type.length>0?e.parameter.lti_type:pageurl;
            
      if (url && oauth_consumer_key && secret) {
        if (saveLTIDataByPage(pageurl, url, oauth_consumer_key, secret, debug, launch_container, custom_parameters)){
          if (e.parameter.lti_type && e.parameter.lti_type.length>0) {
            var current_tool_lti_custom_parameters = e.parameter.current_tool_lti_custom_parameters; 
            var properties = PropertiesService.getScriptProperties();
            properties.setProperty("custom_parameters_"+page.getUrl(), current_tool_lti_custom_parameters);
          }x
          result = {
            ok: true,
          };
        } else {
          result = {
            error: 'CAN_NOT_GET_PROPERTIES',
            error_msg: 'Can not get the properties to update',
          };
        }
      } else {
        result = {
          error: 'MISSING_PARAMETERS',
          error_msg: 'All parameter are required!!!',
        };
      }
     } else {
        result = {
          error: 'NOT_AUTHORIZED',
          error_msg: 'You are not authorized to perform this operation',
        };
     }
  } else {
    
        result = {
          error: 'SITE_NOT_FOUND',
          error_msg: 'The page '+pageurl+' not found',
        };
  }
   return ContentService.createTextOutput(
     'saveLTITool(' + JSON.stringify(result) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);

}

function load_external_data(id) {
  var file = DriveApp.getFileById(id);
  var spreadsheet = SpreadsheetApp.open(file);
  var sheet = spreadsheet.getSheets()[0];
  var lastColumn = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();
  var html = '<p>Total rows '+lastRow+' last column '+lastColumn;

  var key='';
  var value='';
  var prop = PropertiesService.getScriptProperties();
  var newProperties = {};
  for (row=1; row<=lastRow; row++){
    for (column=1; column<=lastColumn; column++) {
      html+='<p>'+sheet.getRange(row, column).getDisplayValue()+'</p>';
      switch (column) {
        case 1:
          key = sheet.getRange(row, column).getDisplayValue();
          break;
        case 2:
          value = sheet.getRange(row, column).getDisplayValue();
          if (key!='' && value!='') {
            html+="<p>Set property with key "+key+" and value "+value+"</p>";
            //Utilities.sleep(5000);
            //prop.setProperty(key, value);
            newProperties.key = value;
          } else {
            html+="<p>Error property the key or value are void review data key:  "+key+" and value "+value+"</p>";            
          }
          break;
        default:
          html+='<h4>Column not use, we only use the first as key and second as value</h4>';          
      }
    }
  }
  prop.setProperties(newProperties);

  return HtmlService.createHtmlOutput(html).setSandboxMode(HtmlService.SandboxMode.IFRAME);  
}


function doGet(e) {
  
  if (e && e.parameter.callback) {
   return saveLTIData(e); 
  }
  
  if (e && e.parameter.load_lti_data && e.parameter.id) {
   return load_external_data(e.parameter.id); 
  }
  

  var html = '';
  var page = SitesApp.getActivePage();
  
  var properties = null;
  var lti_type = '';
  if (e && e.parameter.lti_type && e.parameter.lti_type.length>0) {
    lti_type = e.parameter.lti_type;
  }

  var current_tool_lti_custom_parameters = '';
  if (lti_type!='') {
    properties = getLTIDataByPage(lti_type);
    current_tool_lti_custom_parameters = properties.getProperty("custom_parameters_"+page.getUrl());
  } else {
    properties = getLTIDataByPage(page.getUrl());
  }
  var url = properties.url?properties.url:null;
  var oauth_consumer_key= properties.oauth_consumer_key?properties.oauth_consumer_key:null;
  var secret = properties.secret?properties.secret:null;
  var launch_container = properties.launch_container?properties.launch_container:null;
  var custom_parameters = properties.custom_parameters?properties.custom_parameters:null;
  var debug = properties.debug?properties.debug:false;
  
  var site = SitesApp.getActiveSite();
  //return  HtmlService.createHtmlOutput(SitesApp.getActiveSite().getUrl()).setSandboxMode(HtmlService.SandboxMode.IFRAME);  

  if (url && secret && oauth_consumer_key) {
  
    var http_method = 'POST';
    
    
    var lti_message_type='basic-lti-launch-request';
    var lti_version='LTI-1p0';
    var context_id=site.getUrl();
    //  var context_type='';
    var context_title=site.getTitle();
    var context_label=site.getName();
    var resource_link_id=page.getUrl();
    var resource_link_title=page.getName();
    var resource_link_description=page.getTitle();
    var lis_person_contact_email_primary=Session.getActiveUser().getEmail();
    var user_id=Session.getActiveUser().getEmail();
    var user_image='';
    var roles=getLTIRole(site, lis_person_contact_email_primary);
    var edit_tool = false;
    if (roles=='Administrator' || roles=='Instructor') {
      edit_tool = e && e.parameter.edit_tool==1;
    }

    var launch_presentation_locale=Session.getActiveUserLocale();
    var launch_presentation_document_target=launch_container=='iframe'?'iframe':'';
    var launch_presentation_return_url=page.getUrl();
    
    var oauth_signature_method='HMAC-SHA1';
    var d = new Date();
    var oauth_timestamp = Math.round(d.getTime() / 1000);
    var oauth_nonce=Math.random().toString(36);
    var oauth_version='1.0';
    var request = [];
    request['tool_consumer_info_product_family_code'] = 'googlesites';
    request['tool_consumer_info_version']='1.0.0';
    request['oauth_signature_method'] = oauth_signature_method;
    request['lti_message_type'] = lti_message_type;
    request['lti_version'] = lti_version;
    request['context_id'] = context_id;
    request['context_title'] = context_title;
    request['context_label'] = context_label;
    request['resource_link_id'] = resource_link_id;
    request['resource_link_title'] = resource_link_title;
    request['resource_link_description'] = resource_link_description;
    request['lis_person_contact_email_primary'] = lis_person_contact_email_primary;
// A viewer doesn't have permission to get this value
    request['lis_person_name_full'] = DriveApp.getRootFolder().getOwner().getName();
    request['user_id'] = user_id;
    request['user_image'] = DriveApp.getRootFolder().getOwner().getPhotoUrl();
    if (request['user_image'] == null) {
     request['user_image'] = ""; 
    }
    request['roles'] = roles;
    request['launch_presentation_locale'] = launch_presentation_locale;
    request['launch_presentation_document_target'] = launch_presentation_document_target;
    request['launch_presentation_return_url'] = launch_presentation_return_url;
    request['oauth_consumer_key'] = oauth_consumer_key;
    request['oauth_nonce'] = oauth_nonce;
    request['oauth_timestamp'] = oauth_timestamp;
    request['oauth_version'] = oauth_version;
    request['oauth_callback'] = 'about:blank';
    request['ext_submit'] = 'Launch';
    var custom_parameters_temp = custom_parameters;
    //Check if there are any custom parameter to overwrite
    if (lti_type!='' && current_tool_lti_custom_parameters!='' && custom_parameters!=undefined && custom_parameters.length>0) {
      custom_parameters_temp = current_tool_lti_custom_parameters;
    }
    if (custom_parameters_temp!='' && custom_parameters_temp!=undefined && custom_parameters_temp.length>0) {
      var array_custom_parameters = custom_parameters_temp.split(SEPARATOR_CUSTOM_PARAMS);
      for (var i=0; i<array_custom_parameters.length; i++) {
        var custom_param_array = array_custom_parameters[i].split(SEPARATOR_EACH_CUSTOM_PARAM);
        if (custom_param_array.length==2) {
          request['custom_'+custom_param_array[0]] = custom_param_array[1];
        }
      }
    }
    request['custom_debug'] = 'true';
    
    if (edit_tool) {
      html += editTool(page.getUrl(), url, oauth_consumer_key, secret, debug, launch_container, custom_parameters, current_tool_lti_custom_parameters, lti_type);

    } else {
      html = doSignature(http_method, url, request, secret, debug, launch_container, custom_parameters_temp) ;      
    }
 } else { //no properties
  if (isOwner(site, Session.getActiveUser().getEmail()) || isInstructor(site, Session.getActiveUser().getEmail())) {
     html += editTool(page.getUrl(), url, oauth_consumer_key, secret, debug, launch_container, custom_parameters, current_tool_lti_custom_parameters, lti_type);
  } else {
   html = '<p>The tool is not configurated, the editor or owner of site has to do that</p>'; 
  }
}

  return HtmlService.createHtmlOutput(html).setSandboxMode(HtmlService.SandboxMode.IFRAME);  

};


/***************************************************************************************
    U T I L S
***************************************************************************************/

function editTool(pageurl, url, oauth_consumer_key, secret, debug, launch_container, custom_parameters, current_tool_lti_custom_parameters, lti_type) {
  var script_url = ScriptApp.getService().getUrl(); 
  var ret = '<script src="//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js"></script>\n'+
  '<script>\n'+
    'function saveLTITool(result) { \n'+  
     ' $("#save_lti_configuration").show(); \n'+
     'if (result.error){ alert(result.error_msg);}\n'+  
       'else { \n'+  
         ' if(result.ok){ \n'+  
           ' $("#data_form").html("<h1>Data saved! reload current page</h1>");\n'+   
         '} \n'+  
       '}\n'+    
    '}\n'+ 
   '$( document ).ready(function() {\n'+  
    '$("#generic_configuration").hide();\n'+
    '$("#hide_generic_configuration").hide();\n'+
    '$("#show_generic_configuration").click(function() {\n'+
     ' $("#generic_configuration").show(); \n'+
     ' $("#hide_generic_configuration").show(); \n'+
     ' $("#show_generic_configuration").hide(); \n'+
    ' });\n'+ 
    '$("#hide_generic_configuration").click(function() {\n'+
     ' $("#generic_configuration").hide(); \n'+
     ' $("#hide_generic_configuration").hide(); \n'+
     ' $("#show_generic_configuration").show(); \n'+
    ' });\n'+ 
    '$("#save_lti_configuration").click(function() {\n'+
     ' $("#save_lti_configuration").hide(); \n'+
     ' $.ajax({\n'+   
     '  url: "'+script_url+'",\n'+   
     '  jsonp: "callback",\n'+   
     '  method: "POST",\n'+   
     '  dataType: "jsonp",\n'+   
     '  data: $("#form").serialize(),\n'+   
    ' });\n'+ 
    '});\n'+ 
    '});\n'+   
   '</script>\n'+
  ' <div id="data_form"><form id="form" action="" target="_parent" method="POST">';
  if (lti_type!='' && lti_type!=null)
  {
    ret +='<h4>Warning you are editing generic tool '+lti_type+', you can change the default custom parameters or main configuration (be careful)</h4>'+
      '<p><label for="current_tool_lti_custom_parameters">Custom Parameters to overwrite</label><input type="text" id="current_tool_lti_custom_parameters" name="current_tool_lti_custom_parameters" value="'+noNull(current_tool_lti_custom_parameters)+'" /><br/> <small>For example. key1'+SEPARATOR_EACH_CUSTOM_PARAM+'value1'+SEPARATOR_CUSTOM_PARAMS+'key2'+SEPARATOR_EACH_CUSTOM_PARAM+'value2</small></p>'+
      '<p><input type="button" id="show_generic_configuration" value="Show generic configuration" /><input type="button" id="hide_generic_configuration" value="Hide generic configuration" /></p>'+

      '<div id="generic_configuration"><p><h3>Generic configuration</h3><input type="hidden" id="lti_type" name="lti_type" value="'+noNull(lti_type)+'"/></p>'+  
      '<p><label for="lti_endpoint">Launch URL</label><input type="text" id="lti_endpoint" name="lti_endpoint" value="'+noNull(url)+'" size="50"/></p>'+
      '<p><label for="lti_consumerkey">Consumer key</label><input type="text" id="lti_consumerkey" name="lti_consumerkey" value="'+noNull(oauth_consumer_key)+'" /></p>'+
      '<p><label for="lti_secret">Secret</label><input type="text" id="lti_secret" name="lti_secret" value="'+noNull(secret)+'" /></p>'+
      '<p><label for="lti_custom_parameters">Custom Parameters</label><input type="text" id="lti_custom_parameters" name="lti_custom_parameters" value="'+noNull(custom_parameters)+'" /><br/> <small>For example. key1'+SEPARATOR_EACH_CUSTOM_PARAM+'value1'+SEPARATOR_CUSTOM_PARAMS+'key2'+SEPARATOR_EACH_CUSTOM_PARAM+'value2</small></p>'+
      '<p><label for="lti_launch_container">Launch Container</label><select id="lti_launch_container" name="lti_launch_container">'+
        '<option value="new_window"'+(selected(launch_container, 'new_window'))+'>New Window</option>'+
        '<option value="iframe"'+(selected(launch_container, 'iframe'))+'>Embed</option>'+
          '<!--option value="default"'+(selected(launch_container, 'default'))+'>Current window</option-->'+
       '</select></p>'+
      '<p><label for="lti_secret">Debug</label><select id="lti_debug" name="lti_debug">'+
        '<option value="0" '+(selected(debug, 0))+'>No</option>'+
        '<option value="1" '+(selected(debug, 1))+'>Yes</option>'+
       '</select></p></div>';
      
  } else {

      ret += '<p>New version this script is located on sites->Template Experiment->Settings->Scripts</p>'+  
      '<p><label for="lti_endpoint">Launch URL</label><input type="text" id="lti_endpoint" name="lti_endpoint" value="'+noNull(url)+'" size="50"/></p>'+
      '<p><label for="lti_consumerkey">Consumer key</label><input type="text" id="lti_consumerkey" name="lti_consumerkey" value="'+noNull(oauth_consumer_key)+'" /></p>'+
      '<p><label for="lti_secret">Secret</label><input type="text" id="lti_secret" name="lti_secret" value="'+noNull(secret)+'" /></p>'+
      '<p><label for="lti_custom_parameters">Custom Parameters</label><input type="text" id="lti_custom_parameters" name="lti_custom_parameters" value="'+noNull(custom_parameters)+'" /><br/> <small>For example. key1'+SEPARATOR_EACH_CUSTOM_PARAM+'value1'+SEPARATOR_CUSTOM_PARAMS+'key2'+SEPARATOR_EACH_CUSTOM_PARAM+'value2</small></p>'+
      '<p><label for="lti_launch_container">Launch Container</label><select id="lti_launch_container" name="lti_launch_container">'+
        '<option value="new_window"'+(selected(launch_container, 'new_window'))+'>New Window</option>'+
        '<option value="iframe"'+(selected(launch_container, 'iframe'))+'>Embed</option>'+
          '<!--option value="default"'+(selected(launch_container, 'default'))+'>Current window</option-->'+
       '</select></p>'+
      '<p><label for="lti_secret">Debug</label><select id="lti_debug" name="lti_debug">'+
        '<option value="0" '+(selected(debug, 0))+'>No</option>'+
        '<option value="1" '+(selected(debug, 1))+'>Yes</option>'+
       '</select></p>';
  } 
  ret +=    '<p><input type="button" id="save_lti_configuration" name="save_lti_configuration" value="Save" /></p>'+
      '<input type="hidden" name="pageurl" value="'+pageurl+'" />'+  
        '</form></div>'; 
  return ret;
}

function selected(value, current) {
  return  value==current?' selected':'';
}

  function noNull(value) {
    if (value==null){
      value = "";
    }
    return value;
  }
  
function doSignature(http_method, url, request, secret, debug, launch_container) {
  var keys = arrayKeys(request);
  var values =arrayValues(request);
  var base_string = get_signature_base_string(http_method, url, request);
/*  var signature = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_1, base_string, secret);
  var signatureStr = '';
    for (i = 0; i < signature.length; i++) {
      var byte = signature[i];
      if (byte < 0)
        byte += 256;
      var byteStr = byte.toString(16);
      // Ensure we have 2 chars in our byte, pad with 0
      if (byteStr.length == 1) byteStr = '0'+byteStr;
      signatureStr += byteStr;
    }   
  
  var encoded = Utilities.base64Encode(signatureStr);*/
  secret = secret+'&';
  var encoded  = Utilities.base64Encode(Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_1, base_string, secret, Utilities.Charset.US_ASCII));

  keys[keys.length] = 'oauth_signature';
  values[values.length] = encoded;  
  //html += '<p>Signature '+signatureStr+' encoded: '+encoded+'</p>';
  var html = postLaunchHTML(base_string, keys, values, url, debug, launch_container);
  return html;
}

function postLaunchHTML(last_base_string, keys, values, endpoint, debug, launch_container) {
    // number of elements does not match
    var keycount = keys.length;
    if (keycount != values.length) {
     return false;
    }

    var r = "<div id=\"ltiLaunchFormSubmitArea\">\n";
    if ( launch_container=='iframe' ||  launch_container=='new_window') {
      var target = launch_container=='iframe'?'basicltiLaunchFrame':'_blank';
      if (launch_container=='new_window') {
          r += '<p>Your activity has opened in a new window</p>'; 
      }
      r += "<form action=\""+endpoint+"\" name=\"ltiLaunchForm\" id=\"ltiLaunchForm\" method=\"post\" target=\""+target+"\" encType=\"application/x-www-form-urlencoded\">\n" ;
    } else {
        r += "<form action=\""+endpoint+"\" name=\"ltiLaunchForm\" id=\"ltiLaunchForm\" method=\"post\" encType=\"application/x-www-form-urlencoded\">\n" ;
    }
    var submit_text = '';
     for (i = 0; i < keycount; i++) {
     var key = keys[i];
     var value = values[i];
       if (key == 'ext_submit') {
            submit_text = value;
            r += "<input type=\"submit\" name=\"";
        } else {
            r += "<input type=\"hidden\" name=\"";
        }
        key = htmlspecialchars(key);
        value = htmlspecialchars(value);
        r += key;
        r += "\" value=\"";
        r += value;
        r += "\"/>\n";

    };
    if ( debug ) {
        r += "<script language=\"javascript\"> \n";
        r += "  //<![CDATA[ \n" ;
        r += "function basicltiDebugToggle() {\n";
        r += "    var ele = document.getElementById(\"basicltiDebug\");\n";
        r += "    if(ele.style.display == \"block\") {\n";
        r += "        ele.style.display = \"none\";\n";
        r += "    }\n";
        r += "    else {\n";
        r += "        ele.style.display = \"block\";\n";
        r += "    }\n";
        r += "} \n";
        r += "  //]]> \n" ;
        r += "</script>\n";
        r += "<a id=\"displayText\" href=\"javascript:basicltiDebugToggle();\">";
        r += "toggle_debug_data"+"</a>\n";
        r += "<div id=\"basicltiDebug\" style=\"display:none\">\n";
        r +=  "<b>basiclti_endpoint</b><br/>\n";
        r += endpoint + "<br/>\n&nbsp;<br/>\n";
        r +=  "<b>basiclti_parameters</b><br/>\n";
        for (i = 0; i < keycount; i++) {
          var key = htmlspecialchars(keys[i]);
          var value = htmlspecialchars(values[i]);
          r += key+" = "+value+"<br/>\n";
        }
        r += "&nbsp;<br/>\n";
        r += "<p><b>basiclti_base_string</b><br/>\n"+last_base_string+"</p>\n";
        r += "</div>\n";
    }
    r += "</form>\n";
    if ( launch_container=='iframe') {
        r += "<iframe name=\"basicltiLaunchFrame\"  id=\"basicltiLaunchFrame\" src=\"\"\n";
        r += ">\n<p>frames_required</p>\n</iframe>\n";
    }
    if ( ! debug ) {
        ext_submit = "ext_submit";
        ext_submit_text = submit_text;
        r += " <script type=\"text/javascript\"> \n" +
            "  //<![CDATA[ \n" +
            "    document.getElementById(\"ltiLaunchForm\").style.display = \"none\";\n" +
            "    nei = document.createElement('input');\n" +
            "    nei.setAttribute('type', 'hidden');\n" +
            "    nei.setAttribute('name', '"+ext_submit+"');\n" +
            "    nei.setAttribute('value', '"+ext_submit_text+"');\n" +
            "    document.getElementById(\"ltiLaunchForm\").appendChild(nei);\n" +
            "    document.ltiLaunchForm.submit(); \n" +
            "  //]]> \n" +
            " </script> \n";
    }
    r += "</div>\n";
    return r;
}

function parse_url(str, component) {
  //       discuss at: http://phpjs.org/functions/parse_url/
  //      original by: Steven Levithan (http://blog.stevenlevithan.com)
  // reimplemented by: Brett Zamir (http://brett-zamir.me)
  //         input by: Lorenzo Pisani
  //         input by: Tony
  //      improved by: Brett Zamir (http://brett-zamir.me)
  //             note: original by http://stevenlevithan.com/demo/parseuri/js/assets/parseuri.js
  //             note: blog post at http://blog.stevenlevithan.com/archives/parseuri
  //             note: demo at http://stevenlevithan.com/demo/parseuri/js/assets/parseuri.js
  //             note: Does not replace invalid characters with '_' as in PHP, nor does it return false with
  //             note: a seriously malformed URL.
  //             note: Besides function name, is essentially the same as parseUri as well as our allowing
  //             note: an extra slash after the scheme/protocol (to allow file:/// as in PHP)
  //        example 1: parse_url('http://username:password@hostname/path?arg=value#anchor');
  //        returns 1: {scheme: 'http', host: 'hostname', user: 'username', pass: 'password', path: '/path', query: 'arg=value', fragment: 'anchor'}

  var query, key = ['source', 'scheme', 'authority', 'userInfo', 'user', 'pass', 'host', 'port',
      'relative', 'path', 'directory', 'file', 'query', 'fragment'
    ],
    ini = (this.php_js && this.php_js.ini) || {},
    mode = (ini['phpjs.parse_url.mode'] &&
      ini['phpjs.parse_url.mode'].local_value) || 'php',
    parser = {
      php: /^(?:([^:\/?#]+):)?(?:\/\/()(?:(?:()(?:([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?()(?:(()(?:(?:[^?#\/]*\/)*)()(?:[^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
      strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
      loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/\/?)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/ // Added one optional slash to post-scheme to catch file:/// (should restrict this)
    };

  var m = parser[mode].exec(str),
    uri = {},
    i = 14;
  while (i--) {
    if (m[i]) {
      uri[key[i]] = m[i];
    }
  }

  if (component) {
    return uri[component.replace('PHP_URL_', '')
      .toLowerCase()];
  }
  if (mode !== 'php') {
    var name = (ini['phpjs.parse_url.queryKey'] &&
      ini['phpjs.parse_url.queryKey'].local_value) || 'queryKey';
    parser = /(?:^|&)([^&=]*)=?([^&]*)/g;
    uri[name] = {};
    query = uri[key[12]] || '';
    query.replace(parser, function($0, $1, $2) {
      if ($1) {
        uri[name][$1] = $2;
      }
    });
  }
  delete uri.source;
  return uri;
}


function natsort(inputArr) {
  //  discuss at: http://phpjs.org/functions/natsort/
  // original by: Brett Zamir (http://brett-zamir.me)
  // improved by: Brett Zamir (http://brett-zamir.me)
  // improved by: Theriault
  //        note: This function deviates from PHP in returning a copy of the array instead
  //        note: of acting by reference and returning true; this was necessary because
  //        note: IE does not allow deleting and re-adding of properties without caching
  //        note: of property position; you can set the ini of "phpjs.strictForIn" to true to
  //        note: get the PHP behavior, but use this only if you are in an environment
  //        note: such as Firefox extensions where for-in iteration order is fixed and true
  //        note: property deletion is supported. Note that we intend to implement the PHP
  //        note: behavior by default if IE ever does allow it; only gives shallow copy since
  //        note: is by reference in PHP anyways
  //  depends on: strnatcmp
  //   example 1: $array1 = {a:"img12.png", b:"img10.png", c:"img2.png", d:"img1.png"};
  //   example 1: $array1 = natsort($array1);
  //   returns 1: {d: 'img1.png', c: 'img2.png', b: 'img10.png', a: 'img12.png'}

  var valArr = [],
    k, i, ret, that = this,
    strictForIn = false,
    populateArr = {};

  // BEGIN REDUNDANT
  this.php_js = this.php_js || {};
  this.php_js.ini = this.php_js.ini || {};
  // END REDUNDANT
  strictForIn = this.php_js.ini['phpjs.strictForIn'] && this.php_js.ini['phpjs.strictForIn'].local_value && this.php_js
    .ini['phpjs.strictForIn'].local_value !== 'off';
  populateArr = strictForIn ? inputArr : populateArr;

  // Get key and value arrays
  for (k in inputArr) {
    if (inputArr.hasOwnProperty(k)) {
      valArr.push([k, inputArr[k]]);
      if (strictForIn) {
        delete inputArr[k];
      }
    }
  }
  valArr.sort(function(a, b) {
    return that.strnatcmp(a[1], b[1]);
  });

  // Repopulate the old array
  for (i = 0; i < valArr.length; i++) {
    populateArr[valArr[i][0]] = valArr[i][1];
  }

  return strictForIn || populateArr;
}

function rawurlencode(str) {
  //       discuss at: http://phpjs.org/functions/rawurlencode/
  //      original by: Brett Zamir (http://brett-zamir.me)
  //         input by: travc
  //         input by: Brett Zamir (http://brett-zamir.me)
  //         input by: Michael Grier
  //         input by: Ratheous
  //      bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //      bugfixed by: Brett Zamir (http://brett-zamir.me)
  //      bugfixed by: Joris
  // reimplemented by: Brett Zamir (http://brett-zamir.me)
  // reimplemented by: Brett Zamir (http://brett-zamir.me)
  //             note: This reflects PHP 5.3/6.0+ behavior
  //             note: Please be aware that this function expects to encode into UTF-8 encoded strings, as found on
  //             note: pages served as UTF-8
  //        example 1: rawurlencode('Kevin van Zonneveld!');
  //        returns 1: 'Kevin%20van%20Zonneveld%21'
  //        example 2: rawurlencode('http://kevin.vanzonneveld.net/');
  //        returns 2: 'http%3A%2F%2Fkevin.vanzonneveld.net%2F'
  //        example 3: rawurlencode('http://www.google.nl/search?q=php.js&ie=utf-8&oe=utf-8&aq=t&rls=com.ubuntu:en-US:unofficial&client=firefox-a');
  //        returns 3: 'http%3A%2F%2Fwww.google.nl%2Fsearch%3Fq%3Dphp.js%26ie%3Dutf-8%26oe%3Dutf-8%26aq%3Dt%26rls%3Dcom.ubuntu%3Aen-US%3Aunofficial%26client%3Dfirefox-a'

  str = (str + '')
    .toString();

  // Tilde should be allowed unescaped in future versions of PHP (as reflected below), but if you want to reflect current
  // PHP behavior, you would need to add ".replace(/~/g, '%7E');" to the following.
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .
  replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

/**
 * Gets the arreay keys 
 */
function arrayKeys(input) {
    var output = new Array();
    var counter = 0;
    for (i in input) {
        output[counter++] = i;
    } 
    return output; 
}

/** 
 * Gets the array values
 */
function arrayValues(input) {
  var output = [],
  key = '';
  if (input && typeof input === 'object' && input.change_key_case) { // Duck-type check for our own array()-created PHPJS_Array
    return input.values();
  }
  for (key in input) {
    output[output.length] = input[key];
  }
  return output;
}

function array_combine(keys, values) {
//abertranb changed to array
  var new_array = [],
//  var new_array = {},
    keycount = keys && keys.length,
    i = 0;

  // input sanitation
  if (typeof keys !== 'object' || typeof values !== 'object' || // Only accept arrays or array-like objects
    typeof keycount !== 'number' || typeof values.length !== 'number' || !keycount) { // Require arrays to have a count
    return false;
  }

  // number of elements does not match
  if (keycount != values.length) {
    return false;
  }

  for (i = 0; i < keycount; i++) {
    new_array[keys[i]] = values[i];
  }

  return new_array;
}


function array_combine_pairs(keys, values) {
//abertranb changed to array
  var new_array = [],
//  var new_array = {},
    keycount = keys && keys.length,
    i = 0;

  // input sanitation
  if (typeof keys !== 'object' || typeof values !== 'object' || // Only accept arrays or array-like objects
    typeof keycount !== 'number' || typeof values.length !== 'number' || !keycount) { // Require arrays to have a count
    return false;
  }

  // number of elements does not match
  if (keycount != values.length) {
    return false;
  }

  for (i = 0; i < keycount; i++) {
    new_array[new_array.length] = keys[i]+"="+values[i];
  }

  return new_array;
}
/**
 * 
 * Checks if function is a scalar
 */
function is_scalar(mixed_var) {
  return (/boolean|number|string/)
    .test(typeof mixed_var);
}
function array_map(callback) {
  //  discuss at: http://phpjs.org/functions/array_map/
  // original by: Andrea Giammarchi (http://webreflection.blogspot.com)
  // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: Brett Zamir (http://brett-zamir.me)
  //    input by: thekid
  //        note: If the callback is a string (or object, if an array is supplied), it can only work if the function name is in the global context
  //   example 1: array_map( function (a){return (a * a * a)}, [1, 2, 3, 4, 5] );
  //   returns 1: [ 1, 8, 27, 64, 125 ]

  var argc = arguments.length,
    argv = arguments,
    glbl = this.window,
    obj = null,
    cb = callback,
    j = argv[1].length,
    i = 0,
    k = 1,
    m = 0,
    tmp = [],
    tmp_ar = [];

  while (i < j) {
    while (k < argc) {
      tmp[m++] = argv[k++][i];
    }

    m = 0;
    k = 1;

    if (callback) {
      if (typeof callback === 'string') {
//abertranb canviat ja que no te this.window
        cb = eval(callback);
 //       cb = eval(callback+"('"+this.i+"')");
//        tmp_ar[i++] = cb;
// Original
//      cb = glbl[callback];
      } else if (typeof callback === 'object' && callback.length) {
        obj = typeof callback[0] === 'string' ? glbl[callback[0]] : callback[0];
        if (typeof obj === 'undefined') {
          throw 'Object not found: ' + callback[0];
        }
        cb = typeof callback[1] === 'string' ? obj[callback[1]] : callback[1];
      }
//abertranb mogut
        tmp_ar[i++] = cb.apply(obj, tmp);        
    } else {
      tmp_ar[i++] = tmp;
    }

    tmp = [];
  }

  return tmp_ar;
}

function htmlspecialchars(string, quote_style, charset, double_encode) {
  //       discuss at: http://phpjs.org/functions/htmlspecialchars/
  //      original by: Mirek Slugen
  //      improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //      bugfixed by: Nathan
  //      bugfixed by: Arno
  //      bugfixed by: Brett Zamir (http://brett-zamir.me)
  //      bugfixed by: Brett Zamir (http://brett-zamir.me)
  //       revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //         input by: Ratheous
  //         input by: Mailfaker (http://www.weedem.fr/)
  //         input by: felix
  // reimplemented by: Brett Zamir (http://brett-zamir.me)
  //             note: charset argument not supported
  //        example 1: htmlspecialchars("<a href='test'>Test</a>", 'ENT_QUOTES');
  //        returns 1: '&lt;a href=&#039;test&#039;&gt;Test&lt;/a&gt;'
  //        example 2: htmlspecialchars("ab\"c'd", ['ENT_NOQUOTES', 'ENT_QUOTES']);
  //        returns 2: 'ab"c&#039;d'
  //        example 3: htmlspecialchars('my "&entity;" is still here', null, null, false);
  //        returns 3: 'my &quot;&entity;&quot; is still here'

  var optTemp = 0,
    i = 0,
    noquotes = false;
  if (typeof quote_style === 'undefined' || quote_style === null) {
    quote_style = 2;
  }
  if (string==null) {
   return ""; 
  }
  string = string.toString();
  if (double_encode !== false) { // Put this first to avoid double-encoding
    string = string.replace(/&/g, '&amp;');
  }
  string = string.replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  var OPTS = {
    'ENT_NOQUOTES': 0,
    'ENT_HTML_QUOTE_SINGLE': 1,
    'ENT_HTML_QUOTE_DOUBLE': 2,
    'ENT_COMPAT': 2,
    'ENT_QUOTES': 3,
    'ENT_IGNORE': 4
  };
  if (quote_style === 0) {
    noquotes = true;
  }
  if (typeof quote_style !== 'number') { // Allow for a single string or an array of string flags
    quote_style = [].concat(quote_style);
    for (i = 0; i < quote_style.length; i++) {
      // Resolve string input to bitwise e.g. 'ENT_IGNORE' becomes 4
      if (OPTS[quote_style[i]] === 0) {
        noquotes = true;
      } else if (OPTS[quote_style[i]]) {
        optTemp = optTemp | OPTS[quote_style[i]];
      }
    }
    quote_style = optTemp;
  }
  if (quote_style & OPTS.ENT_HTML_QUOTE_SINGLE) {
    string = string.replace(/'/g, '&#039;');
  }
  if (!noquotes) {
    string = string.replace(/"/g, '&quot;');
  }

  return string;
}
function isset() {
  //  discuss at: http://phpjs.org/functions/isset/
  // original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: FremyCompany
  // improved by: Onno Marsman
  // improved by: Rafał Kukawski
  //   example 1: isset( undefined, true);
  //   returns 1: false
  //   example 2: isset( 'Kevin van Zonneveld' );
  //   returns 2: true

  var a = arguments,
    l = a.length,
    i = 0,
    undef;

  if (l === 0) {
    throw new Error('Empty isset');
  }

  while (i !== l) {
    if (a[i] === undef || a[i] === null) {
      return false;
    }
    i++;
  }
  return true;
}

function is_array(mixed_var) {
  //  discuss at: http://phpjs.org/functions/is_array/
  // original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: Legaev Andrey
  // improved by: Onno Marsman
  // improved by: Brett Zamir (http://brett-zamir.me)
  // improved by: Nathan Sepulveda
  // improved by: Brett Zamir (http://brett-zamir.me)
  // bugfixed by: Cord
  // bugfixed by: Manish
  // bugfixed by: Brett Zamir (http://brett-zamir.me)
  //        note: In php.js, javascript objects are like php associative arrays, thus JavaScript objects will also
  //        note: return true in this function (except for objects which inherit properties, being thus used as objects),
  //        note: unless you do ini_set('phpjs.objectsAsArrays', 0), in which case only genuine JavaScript arrays
  //        note: will return true
  //   example 1: is_array(['Kevin', 'van', 'Zonneveld']);
  //   returns 1: true
  //   example 2: is_array('Kevin van Zonneveld');
  //   returns 2: false
  //   example 3: is_array({0: 'Kevin', 1: 'van', 2: 'Zonneveld'});
  //   returns 3: true
  //   example 4: is_array(function tmp_a(){this.name = 'Kevin'});
  //   returns 4: false

  var ini,
    _getFuncName = function(fn) {
      var name = (/\W*function\s+([\w\$]+)\s*\(/)
        .exec(fn);
      if (!name) {
        return '(Anonymous)';
      }
      return name[1];
    };
  _isArray = function(mixed_var) {
    // return Object.prototype.toString.call(mixed_var) === '[object Array]';
    // The above works, but let's do the even more stringent approach: (since Object.prototype.toString could be overridden)
    // Null, Not an object, no length property so couldn't be an Array (or String)
    if (!mixed_var || typeof mixed_var !== 'object' || typeof mixed_var.length !== 'number') {
      return false;
    }
    var len = mixed_var.length;
    mixed_var[mixed_var.length] = 'bogus';
    // The only way I can think of to get around this (or where there would be trouble) would be to have an object defined
    // with a custom "length" getter which changed behavior on each call (or a setter to mess up the following below) or a custom
    // setter for numeric properties, but even that would need to listen for specific indexes; but there should be no false negatives
    // and such a false positive would need to rely on later JavaScript innovations like __defineSetter__
    if (len !== mixed_var.length) { // We know it's an array since length auto-changed with the addition of a
      // numeric property at its length end, so safely get rid of our bogus element
      mixed_var.length -= 1;
      return true;
    }
    // Get rid of the property we added onto a non-array object; only possible
    // side-effect is if the user adds back the property later, it will iterate
    // this property in the older order placement in IE (an order which should not
    // be depended on anyways)
    delete mixed_var[mixed_var.length];
    return false;
  };

  if (!mixed_var || typeof mixed_var !== 'object') {
    return false;
  }

  // BEGIN REDUNDANT
  this.php_js = this.php_js || {};
  this.php_js.ini = this.php_js.ini || {};
  // END REDUNDANT

  ini = this.php_js.ini['phpjs.objectsAsArrays'];

  return _isArray(mixed_var) ||
  // Allow returning true unless user has called
  // ini_set('phpjs.objectsAsArrays', 0) to disallow objects as arrays
  ((!ini || ( // if it's not set to 0 and it's not 'off', check for objects as arrays
    (parseInt(ini.local_value, 10) !== 0 && (!ini.local_value.toLowerCase || ini.local_value.toLowerCase() !==
      'off')))) && (
    Object.prototype.toString.call(mixed_var) === '[object Object]' && _getFuncName(mixed_var.constructor) ===
    'Object' // Most likely a literal and intended as assoc. array
  ));
}
function explode(delimiter, string, limit) {
  //  discuss at: http://phpjs.org/functions/explode/
  // original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //   example 1: explode(' ', 'Kevin van Zonneveld');
  //   returns 1: {0: 'Kevin', 1: 'van', 2: 'Zonneveld'}

  if (arguments.length < 2 || typeof delimiter === 'undefined' || typeof string === 'undefined') return null;
  if (delimiter === '' || delimiter === false || delimiter === null) return false;
  if (typeof delimiter === 'function' || typeof delimiter === 'object' || typeof string === 'function' || typeof string ===
    'object') {
    return {
      0: ''
    };
  }
  if (delimiter === true) delimiter = '1';

  // Here we go...
  delimiter += '';
  string += '';

  var s = string.split(delimiter);

  if (typeof limit === 'undefined') return s;

  // Support for limit
  if (limit === 0) limit = 1;

  // Positive limit
  if (limit > 0) {
    if (limit >= s.length) return s;
    return s.slice(0, limit - 1)
      .concat([s.slice(limit - 1)
        .join(delimiter)
      ]);
  }

  // Negative limit
  if (-limit >= s.length) return [];

  s.splice(s.length + limit);
  return s;
}

function implode(glue, pieces) {
  //  discuss at: http://phpjs.org/functions/implode/
  // original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // improved by: Waldo Malqui Silva
  // improved by: Itsacon (http://www.itsacon.net/)
  // bugfixed by: Brett Zamir (http://brett-zamir.me)
  //   example 1: implode(' ', ['Kevin', 'van', 'Zonneveld']);
  //   returns 1: 'Kevin van Zonneveld'
  //   example 2: implode(' ', {first:'Kevin', last: 'van Zonneveld'});
  //   returns 2: 'Kevin van Zonneveld'

  var i = '',
    retVal = '',
    tGlue = '';
  if (arguments.length === 1) {
    pieces = glue;
    glue = '';
  }
  if (typeof pieces === 'object') {
    if (Object.prototype.toString.call(pieces) === '[object Array]') {
      return pieces.join(glue);
    }
    for (i in pieces) {
      retVal += tGlue + pieces[i];
      tGlue = glue;
    }
    return retVal;
  }
  return pieces;
}

function uksort(inputArr, sorter) {
  //  discuss at: http://phpjs.org/functions/uksort/
  // original by: Brett Zamir (http://brett-zamir.me)
  // improved by: Brett Zamir (http://brett-zamir.me)
  //        note: The examples are correct, this is a new way
  //        note: This function deviates from PHP in returning a copy of the array instead
  //        note: of acting by reference and returning true; this was necessary because
  //        note: IE does not allow deleting and re-adding of properties without caching
  //        note: of property position; you can set the ini of "phpjs.strictForIn" to true to
  //        note: get the PHP behavior, but use this only if you are in an environment
  //        note: such as Firefox extensions where for-in iteration order is fixed and true
  //        note: property deletion is supported. Note that we intend to implement the PHP
  //        note: behavior by default if IE ever does allow it; only gives shallow copy since
  //        note: is by reference in PHP anyways
  //   example 1: data = {d: 'lemon', a: 'orange', b: 'banana', c: 'apple'};
  //   example 1: data = uksort(data, function (key1, key2){ return (key1 == key2 ? 0 : (key1 > key2 ? 1 : -1)); });
  //   example 1: $result = data
  //   returns 1: {a: 'orange', b: 'banana', c: 'apple', d: 'lemon'}

  var tmp_arr = {},
    keys = [],
    i = 0,
    k = '',
    strictForIn = false,
    populateArr = {};

  if (typeof sorter === 'string') {
    sorter = eval(sorter);
  }

  // Make a list of key names
  for (k in inputArr) {
    if (inputArr.hasOwnProperty(k)) {
      keys.push(k);
    }
  }

  // Sort key names
  try {
    if (sorter) {
      keys.sort(sorter);
    } else {
      keys.sort();
    }
  } catch (e) {
    return false;
  }

  // BEGIN REDUNDANT
  this.php_js = this.php_js || {};
  this.php_js.ini = this.php_js.ini || {};
  // END REDUNDANT
  strictForIn = this.php_js.ini['phpjs.strictForIn'] && this.php_js.ini['phpjs.strictForIn'].local_value && this.php_js
    .ini['phpjs.strictForIn'].local_value !== 'off';
  populateArr = strictForIn ? inputArr : populateArr;

  // Rebuild array with sorted key names
  for (i = 0; i < keys.length; i++) {
    k = keys[i];
    tmp_arr[k] = inputArr[k];
    if (strictForIn) {
      delete inputArr[k];
    }
  }
  for (i in tmp_arr) {
    if (tmp_arr.hasOwnProperty(i)) {
      populateArr[i] = tmp_arr[i];
    }
  }
  return strictForIn || populateArr;
}

function strcmp(str1, str2) {
  //  discuss at: http://phpjs.org/functions/strcmp/
  // original by: Waldo Malqui Silva
  //    input by: Steve Hilder
  // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //  revised by: gorthaur
  //   example 1: strcmp( 'waldo', 'owald' );
  //   returns 1: 1
  //   example 2: strcmp( 'owald', 'waldo' );
  //   returns 2: -1

  return ((str1 == str2) ? 0 : ((str1 > str2) ? 1 : -1));
}

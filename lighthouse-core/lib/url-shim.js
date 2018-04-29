/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * URL shim so we keep our code DRY
 */

/* global self */

const Util = require('../report/v2/renderer/util.js');

// Type cast so tsc sees window.URL and require('url').URL as sufficiently equivalent.
const URL = /** @type {!Window["URL"]} */ (typeof self !== 'undefined' && self.URL) ||
    require('url').URL;

/**
 * There is fancy URL rewriting logic for the chrome://settings page that we need to work around.
 * Why? Special handling was added by Chrome team to allow a pushState transition between chrome:// pages.
 * As a result, the network URL (chrome://chrome/settings/) doesn't match the final document URL (chrome://settings/).
 * @param {string} url
 * @return {string}
 */
function rewriteChromeInternalUrl(url) {
  if (!url || !url.startsWith('chrome://')) return url;
  // Chrome adds a trailing slash to `chrome://` URLs, but the spec does not.
  //   https://github.com/GoogleChrome/lighthouse/pull/3941#discussion_r154026009
  if (url.endsWith('/')) url = url.replace(/\/$/, '');
  return url.replace(/^chrome:\/\/chrome\//, 'chrome://');
}

class URLShim extends URL {
  /**
   * @param {string} url
   * @return {boolean}
   */
  static isValid(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * @param {string} urlA
   * @param {string} urlB
   * @return {boolean}
   */
  static hostsMatch(urlA, urlB) {
    try {
      return new URL(urlA).host === new URL(urlB).host;
    } catch (e) {
      return false;
    }
  }

  /**
   * @param {string} urlA
   * @param {string} urlB
   * @return {boolean}
   */
  static originsMatch(urlA, urlB) {
    try {
      return new URL(urlA).origin === new URL(urlB).origin;
    } catch (e) {
      return false;
    }
  }

  /**
   * @param {string} url
   * @return {?string}
   */
  static getOrigin(url) {
    try {
      const urlInfo = new URL(url);
      // check for both host and origin since some URLs schemes like data and file set origin to the
      // string "null" instead of the object
      return (urlInfo.host && urlInfo.origin) || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Check if rootDomains matches
   *
   * @param {string} urlA
   * @param {string} urlB
   */
  static rootDomainsMatch(urlA, urlB) {
    const urlAInfo = new URL(urlA);
    const urlBInfo = new URL(urlB);

    if (!urlAInfo.host || !urlBInfo.host) {
      return false;
    }

    const urlARootDomain = urlAInfo.host.split('.').slice(-2).join('.');
    const urlBRootDomain = urlBInfo.host.split('.').slice(-2).join('.');

    return urlARootDomain === urlBRootDomain;
  }

  /**
   * @param {string} url
   * @param {{numPathParts: number, preserveQuery: boolean, preserveHost: boolean}=} options
   * @return {string}
   */
  static getURLDisplayName(url, options) {
    return Util.getURLDisplayName(new URL(url), options);
  }

  /**
   * Limits data URIs to 100 characters, returns all other strings untouched.
   * @param {string} url
   * @return {string}
   */
  static elideDataURI(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'data:' ? url.slice(0, 100) : url;
    } catch (e) {
      return url;
    }
  }

  /**
   * Determine if url1 equals url2, ignoring URL fragments.
   * @param {string} url1
   * @param {string} url2
   * @return {boolean}
   */
  static equalWithExcludedFragments(url1, url2) {
    [url1, url2] = [url1, url2].map(rewriteChromeInternalUrl);
    try {
      const urla = new URL(url1);
      urla.hash = '';

      const urlb = new URL(url2);
      urlb.hash = '';

      return urla.href === urlb.href;
    } catch (e) {
      return false;
    }
  }
}

URLShim.URLSearchParams = (typeof self !== 'undefined' && self.URLSearchParams) ||
    require('url').URLSearchParams;

URLShim.INVALID_URL_DEBUG_STRING =
    'Lighthouse was unable to determine the URL of some script executions. ' +
    'It\'s possible a Chrome extension or other eval\'d code is the source.';

module.exports = URLShim;

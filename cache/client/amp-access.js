/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(window.AMP = window.AMP || []).push(function(AMP) {
  // TODO(dvoytenko): This is most likely to become the part of the runtime or
  // a separate extension.

  function ClientAuth() {
    var accessStruct;
    var accessStructVal = window.localStorage.getItem('amp-access');
    if (accessStructVal) {
      accessStruct = JSON.parse(accessStructVal);
    } else {
      accessStruct = {
        readerId: 'aaaaaa-aaa'.replace(/a/g, function() {
          var r = Math.round(Math.random() * 16) % 16;
          return r.toString(16);
        })
      };
      window.localStorage.setItem('amp-access', JSON.stringify(accessStruct));
    }
    this.accessStruct_ = accessStruct;
    this.readerId_ = accessStruct.readerId;
    console.log('Reader ID: ', this.readerId_);

    this.pubAccessData_ = null;

    this.accessMeta_ = getAccessMeta();
    console.log('access meta:', this.accessMeta_);

    // TODO(dvoytenko): apply access optimistically right away before CORS is
    // fetched.
  }

  ClientAuth.prototype.start = function() {
    this.fetchCors_().then(this.makeAccessDecision_.bind(this),
        function(error) {
          console.error('Access request failed: ', error);
        });
  };


  ClientAuth.prototype.makeAccessDecision_ = function(accessData) {
    console.log('Access data: ', accessData);
    this.pubAccessData_ = accessData;
    var elements = document.querySelectorAll('[amp-access]');
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].tagName != 'META') {
        this.applyAccess_(elements[i], accessData);
      }
    }
  };

  ClientAuth.prototype.applyAccess_ = function(element, accessData) {
    var expr = element.getAttribute('amp-access');
    // TODO(dvoytenko): Use class instead of direct `display` modification.
    element.style.display = this.checkExpr_(expr, accessData) ?
        'block' : 'none';
  };

  ClientAuth.prototype.checkExpr_ = function(expr, accessData) {
    // TODO(dvoytenko): proper expression evaluator
    const hasAccess = accessData.access;
    if (expr == 'access = 1') {
      return hasAccess;
    }
    if (expr == 'access = 0') {
      return !hasAccess;
    }
    return false;
  };


  ClientAuth.prototype.getPubReaderId_ = function(pubId) {
    // TODO(dvoytenko): hash(readerId,pubId)
    return 'SHA_' + pubId + ':' + this.readerId_;
  };

  ClientAuth.prototype.fetchCors_ = function() {
    var url = parseUrl(this.accessMeta_.rpc);
    var urlString = url.href + '?rid=' + encodeURIComponent(
        this.getPubReaderId_(url.host));
    console.log('Access RPC: ', urlString);
    return fetch(urlString, {credentials: 'include'}).then(function(response) {
      return response.json();
    });
  };


  function getAccessMeta() {
    var el = document.querySelector(
        'meta[name=amp-access],meta[http-equiv=amp-access]');
    if (!el) {
      throw new Error('No access metadata');
    }
    var meta = el.getAttribute('content');
    var access = {};
    // TODO: What if URLs contain semicolons?
    var params = meta.split(';');
    params.forEach(function(param) {
      if (!param) {
        return;
      }
      var index = param.indexOf('=');
      if (index <= 0) {
        return;
      }
      access[param.substring(0, index).trim()] =
          param.substring(index + 1).trim();
    });
    return access;
  }

  function parseUrl(url) {
    var a = document.createElement('a');
    a.href = url;
    return {
      href: a.href,
      protocol: a.protocol,
      host: a.host,
      hostname: a.hostname,
      port: a.port == '0' ? '' : a.port,
      pathname: a.pathname,
      search: a.search,
      hash: a.hash
    };
  }


  var clientAuth_ = new ClientAuth();
  clientAuth_.start();
});
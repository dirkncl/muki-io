//nanoscroller
!function (e) {
  return "function" == typeof define && define.amd ? define(["jquery"], function (t) {
    return e(t, window, document)
  }) : "object" == typeof exports ? module.exports = e(require("jquery"), window, document) : e(jQuery, window, document)
}(
  function (e, t, n) {
  "use strict";
  var r, i, o, a, s, u, l, c, f, h, d, p, g, m, y, v, b, w, T, x, _, C, S, A, k, M, N, P, I, D, O;
  S = {
        paneClass: "nano-pane",
        sliderClass: "nano-slider",
        contentClass: "nano-content",
        iOSNativeScrolling: !1,
        preventPageScrolling: !1,
        disableResize: !1,
        alwaysVisible: !1,
        flashDelay: 1500,
        sliderMinHeight: 20,
        sliderMaxHeight: null,
        documentContext: null,
        windowContext: null
      }, 
  w = "scrollbar", 
  b = "scroll", 
  f = "mousedown", 
  h = "mouseenter", 
  d = "mousemove", 
  g = "mousewheel", 
  p = "mouseup", 
  v = "resize", 
  s = "drag", 
  u = "enter", 
  x = "up", 
  y = "panedown", 
  o = "DOMMouseScroll", 
  a = "down", 
  _ = "wheel", 
  l = "keydown", 
  c = "keyup", 
  T = "touchmove", 
  r = "Microsoft Internet Explorer" === t.navigator.appName && /msie 7./i.test(t.navigator.appVersion) && t.ActiveXObject, i = null, 
  N = t.requestAnimationFrame, 
  C = t.cancelAnimationFrame, 
  I = n.createElement("div").style, 
  O = function () {
    var e, t, n, r, i, o;
    for (r = ["t", "webkitT", "MozT", "msT", "OT"], e = i = 0, o = r.length; o > i; e = ++i)
      if (n = r[e], t = r[e] + "ransform", t in I) return r[e].substr(0, r[e].length - 1);
    return !1
  }(), 
  D = function (e) {
    return O === !1 ? !1 : "" === O ? e : O + e.charAt(0).toUpperCase() + e.substr(1)
  }, 
  P = D("transform"), 
  k = P !== !1, 
  A = function () {
    var e, t, r;
    return (
      e = n.createElement("div"), 
      t = e.style, 
      t.position = "absolute", 
      t.width = "100px", 
      t.height = "100px", 
      t.overflow = b, 
      t.top = "-9999px", 
      n.body.appendChild(e), 
      r = e.offsetWidth - e.clientWidth, 
      n.body.removeChild(e), 
      r
    )
  }, 
  M = function () {
    var e, n, r;
    return n = t.navigator.userAgent, (e = /(?=.+Mac OS X)(?=.+Firefox)/.test(n)) ? (r = /Firefox\/\d{2}\./.exec(n), r && (r = r[0].replace(/\D+/g, "")), e && +r > 23) : !1
  }, 
  m = function () {
    function l(r, o) {
      this.el = r, 
      this.options = o, 
      i || (i = A()), 
      this.$el = e(this.el), 
      this.doc = e(this.options.documentContext || n), 
      this.win = e(this.options.windowContext || t), 
      this.body = this.doc.find("body"), 
      this.$content = this.$el.children("." + this.options.contentClass), 
      this.$content.attr("tabindex", this.options.tabIndex || 0), 
      this.content = this.$content[0], 
      this.previousPosition = 0, 
      this.options.iOSNativeScrolling && null != this.el.style.WebkitOverflowScrolling ? this.nativeScrolling() : this.generate(), 
      this.createEvents(), 
      this.addEvents(), 
      this.reset()
    }
    return (
    l.prototype.preventScrolling = function (e, t) {
      if (this.isActive)
        if (e.type === o)(t === a && e.originalEvent.detail > 0 || t === x && e.originalEvent.detail < 0) && e.preventDefault();
        else if (e.type === g) {
        if (!e.originalEvent || !e.originalEvent.wheelDelta) return;
        (t === a && e.originalEvent.wheelDelta < 0 || t === x && e.originalEvent.wheelDelta > 0) && e.preventDefault()
      }
    }, 
    l.prototype.nativeScrolling = function () {
      this.$content.css({
        WebkitOverflowScrolling: "touch"
      }), this.iOSNativeScrolling = !0, this.isActive = !0
    }, 
    l.prototype.updateScrollValues = function () {
      var e, t;
      e = this.content, this.maxScrollTop = e.scrollHeight - e.clientHeight, this.prevScrollTop = this.contentScrollTop || 0, this.contentScrollTop = e.scrollTop, t = this.contentScrollTop > this.previousPosition ? "down" : this.contentScrollTop < this.previousPosition ? "up" : "same", this.previousPosition = this.contentScrollTop, "same" !== t && this.$el.trigger("update", {
        position: this.contentScrollTop,
        maximum: this.maxScrollTop,
        direction: t
      }), this.iOSNativeScrolling || (this.maxSliderTop = this.paneHeight - this.sliderHeight, this.sliderTop = 0 === this.maxScrollTop ? 0 : this.contentScrollTop * this.maxSliderTop / this.maxScrollTop)
    }, 
    l.prototype.setOnScrollStyles = function () {
      var e;
      k ? (e = {}, e[P] = "translate(0, " + this.sliderTop + "px)") : e = {
        top: this.sliderTop
      }, N ? (C && this.scrollRAF && C(this.scrollRAF), this.scrollRAF = N(function (t) {
        return function () {
          return t.scrollRAF = null, t.slider.css(e)
        }
      }(this))) : this.slider.css(e)
    }, 
    l.prototype.createEvents = function () {
      this.events = {
        down: function (e) {
          return function (t) {
            return e.isBeingDragged = !0, e.offsetY = t.pageY - e.slider.offset().top, e.slider.is(t.target) || (e.offsetY = 0),
              e.pane.addClass("active"), e.doc.bind(d, e.events[s]).bind(p, e.events[x]), e.body.bind(h, e.events[u]), !1
          }
        }(this),
        drag: function (e) {
          return function (t) {
            return e.sliderY = t.pageY - e.$el.offset().top - e.paneTop - (e.offsetY || .5 * e.sliderHeight), e.scroll(), e.contentScrollTop >= e.maxScrollTop && e.prevScrollTop !== e.maxScrollTop ? e.$el.trigger("scrollend") : 0 === e.contentScrollTop && 0 !== e.prevScrollTop && e.$el.trigger("scrolltop"), !1
          }
        }(this),
        up: function (e) {
          return function (t) {
            return e.isBeingDragged = !1, e.pane.removeClass("active"), e.doc.unbind(d, e.events[s]).unbind(p, e.events[x]), e.body.unbind(h, e.events[u]), !1
          }
        }(this),
        resize: function (e) {
          return function (t) {
            e.reset()
          }
        }(this),
        panedown: function (e) {
          return function (t) {
            return e.sliderY = (t.offsetY || t.originalEvent.layerY) - .5 * e.sliderHeight, e.scroll(), e.events.down(t), !1
          }
        }(this),
        scroll: function (e) {
          return function (t) {
            e.updateScrollValues(), 
            e.isBeingDragged || (e.iOSNativeScrolling || (e.sliderY = e.sliderTop, e.setOnScrollStyles()), null != t && (e.contentScrollTop >= e.maxScrollTop ? (e.options.preventPageScrolling && e.preventScrolling(t, a), e.prevScrollTop !== e.maxScrollTop && e.$el.trigger("scrollend")) : 0 === e.contentScrollTop && (e.options.preventPageScrolling && e.preventScrolling(t, x), 0 !== e.prevScrollTop && e.$el.trigger("scrolltop"))))
          }
        }(this),
        wheel: function (e) {
          return function (t) {
            var n;
            if (null != t) return n = t.delta || t.wheelDelta || t.originalEvent && t.originalEvent.wheelDelta || -t.detail || t.originalEvent && -t.originalEvent.detail, n && (e.sliderY += -n / 3), e.scroll(), !1
          }
        }(this),
        enter: function (e) {
          return function (t) {
            var n;
            if (e.isBeingDragged) return 1 !== (t.buttons || t.which) ? (n = e.events)[x].apply(n, arguments) : void 0
          }
        }(this)
      }
    }, 
    l.prototype.addEvents = function () {
      var e;
      this.removeEvents(), e = this.events, this.options.disableResize || this.win.bind(v, e[v]), this.iOSNativeScrolling || (this.slider.bind(f, e[a]), this.pane.bind(f, e[y]).bind("" + g + " " + o, e[_])), this.$content.bind("" + b + " " + g + " " + o + " " + T, e[b])
    }, 
    l.prototype.removeEvents = function () {
      var e;
      e = this.events, this.win.unbind(v, e[v]), this.iOSNativeScrolling || (this.slider.unbind(), this.pane.unbind()), this.$content.unbind("" + b + " " + g + " " + o + " " + T, e[b])
    }, 
    l.prototype.generate = function () {
      var e, n, r, o, a, s, u;
      return (
        o = this.options, 
        s = o.paneClass, 
        u = o.sliderClass, 
        e = o.contentClass, 
        (a = this.$el.children("." + s)).length || a.children("." + u).length || this.$el.append('<div class="' + s + '"><div class="' + u + '" /></div>'), 
        this.pane = this.$el.children("." + s), 
        this.slider = this.pane.find("." + u), 
        0 === i && M() ? 
          (
            r = t.getComputedStyle(this.content, null).getPropertyValue("padding-right").replace(/[^0-9.]+/g, ""), 
            n = {
              right: -14,
              paddingRight: +r + 14
            }
          ) 
        : 
          i && 
          (
            n = {
              right: -i
            }, 
            this.$el.addClass("has-scrollbar")
          ), 
          null != n && this.$content.css(n), 
        this
      )
    }, 
    l.prototype.restore = function () {
      this.stopped = !1, this.iOSNativeScrolling || this.pane.show(), this.addEvents()
    }, 
    l.prototype.reset = function () {
      var e, t, n, o, a, s, u, l, c, f, h, d;
      return this.iOSNativeScrolling ? void(this.contentHeight = this.content.scrollHeight) : (this.$el.find("." + this.options.paneClass).length || this.generate().stop(), this.stopped && this.restore(), e = this.content, o = e.style, a = o.overflowY, r && this.$content.css({
        height: this.$content.height()
      }), t = e.scrollHeight + i, f = parseInt(this.$el.css("max-height"), 10), f > 0 && (this.$el.height(""), this.$el.height(e.scrollHeight > f ? f : e.scrollHeight)), u = this.pane.outerHeight(!1), c = parseInt(this.pane.css("top"), 10), s = parseInt(this.pane.css("bottom"), 10), l = u + c + s, d = Math.round(l / t * u), d < this.options.sliderMinHeight ? d = this.options.sliderMinHeight : null != this.options.sliderMaxHeight && d > this.options.sliderMaxHeight && (d = this.options.sliderMaxHeight), a === b && o.overflowX !== b && (d += i), this.maxSliderTop = l - d, this.contentHeight = t, this.paneHeight = u, this.paneOuterHeight = l, this.sliderHeight = d, this.paneTop = c, this.slider.height(d), this.events.scroll(), this.pane.show(), this.isActive = !0, e.scrollHeight === e.clientHeight || this.pane.outerHeight(!0) >= e.scrollHeight && a !== b ? (this.pane.hide(), this.isActive = !1) : this.el.clientHeight === e.scrollHeight && a === b ? this.slider.hide() : this.slider.show(), this.pane.css({
        opacity: this.options.alwaysVisible ? 1 : "",
        visibility: this.options.alwaysVisible ? "visible" : ""
      }), n = this.$content.css("position"), ("static" === n || "relative" === n) && (h = parseInt(this.$content.css("right"), 10), h && this.$content.css({
        right: "",
        marginRight: h
      })), this)
    }, 
    l.prototype.scroll = function () {
      return this.isActive ? (this.sliderY = Math.max(0, this.sliderY), this.sliderY = Math.min(this.maxSliderTop, this.sliderY), this.$content.scrollTop(this.maxScrollTop * this.sliderY / this.maxSliderTop), this.iOSNativeScrolling || (this.updateScrollValues(), this.setOnScrollStyles()), this) : void 0
    }, 
    l.prototype.scrollBottom = function (e) {
      return this.isActive ? (this.$content.scrollTop(this.contentHeight - this.$content.height() - e).trigger(g), this.stop().restore(), this) : void 0
    }, 
    l.prototype.scrollTop = function (e) {
      return this.isActive ? (this.$content.scrollTop(+e).trigger(g), this.stop().restore(), this) : void 0
    }, 
    l.prototype.scrollTo = function (e) {
      return this.isActive ? (this.scrollTop(this.$el.find(e).get(0).offsetTop), this) : void 0
    }, 
    l.prototype.stop = function () {
      return C && this.scrollRAF && (C(this.scrollRAF), this.scrollRAF = null), this.stopped = !0, this.removeEvents(), this.iOSNativeScrolling || this.pane.hide(), this
    }, 
    l.prototype.destroy = function () {
      return this.stopped || this.stop(), !this.iOSNativeScrolling && this.pane.length && this.pane.remove(), r && this.$content.height(""), this.$content.removeAttr("tabindex"), this.$el.hasClass("has-scrollbar") && (this.$el.removeClass("has-scrollbar"), this.$content.css({
        right: ""
      })), this
    }, 
    l.prototype.flash = function () {
      return !this.iOSNativeScrolling && this.isActive ? (this.reset(), this.pane.addClass("flashed"), setTimeout(function (e) {
        return function () {
          e.pane.removeClass("flashed")
        }
      }(this), this.options.flashDelay), this) : void 0
    }, 
    l
    )
  }(),
  e.fn.nanoScroller = function (t) {
    return this.each(function () {
      var n, r;
      if ((r = this.nanoscroller) || (n = e.extend({}, S, t), this.nanoscroller = r = new m(this, n)), t && "object" == typeof t) {
        if (e.extend(r.options, t), null != t.scrollBottom) return r.scrollBottom(t.scrollBottom);
        if (null != t.scrollTop) return r.scrollTop(t.scrollTop);
        if (t.scrollTo) return r.scrollTo(t.scrollTo);
        if ("bottom" === t.scroll) return r.scrollBottom(0);
        if ("top" === t.scroll) return r.scrollTop(0);
        if (t.scroll && t.scroll instanceof e) return r.scrollTo(t.scroll);
        if (t.stop) return r.stop();
        if (t.destroy) return r.destroy();
        if (t.flash) return r.flash()
      }
      return r.reset()
    })
  }, 
  e.fn.nanoScroller.Constructor = m
})
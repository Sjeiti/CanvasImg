/*!
* CANVASIMG 0.5.9
* Copyright (c) 2010-2013 Ron Valstar http://www.sjeiti.com/
*
* Dual licensed under the MIT and GPL licenses:
*   http://www.opensource.org/licenses/mit-license.php
*   http://www.gnu.org/licenses/gpl.html
*/
/*
* Description:
*   Canvas Image is a javascript object for image transitions using a canvas.
*
* Usage:
*
* Change default like so:
*
*/
if (!CIMG) {
	var CIMG = function() {
		if (!console) console = {};
		if (!console.log) console.log = function(){};
		if (!console.warn) console.warn = function(){};
		function assert(test,warning) {
			if (!test) console.log(warning);
		}
		var supportsCanvas = !!document.createElement('canvas').getContext;
		assert(TWEEN,'You need to include Sole\'s tween.js');
		assert(supportsCanvas,'The canvas element is not supported in this browser.');

		var o = {
			 transition:	{}
			,constructor:	null
			,id:			"CanvasImg"
			,version:		"0.5.9"
			,copyright: 'Copyright (c) 2008-2013 Ron Valstar'
			,uri: 'http://canvasimg.sjeiti.com/'
			,licensed: {
				MIT: 'http://www.opensource.org/licenses/mit-license.php'
				,GPL: 'http://www.gnu.org/licenses/gpl.html'
			}
			,defaults: { // global variables
				 globalScale:	1 // todo: implement global
				,toDataURL:		false // todo: implement global, with "image/jpeg",.1  and   "image/png"
				,tweenType:		TWEEN.Easing.Linear.EaseNone
				,transition:	null
				,time:			1000
				,frameRate:		42 // 1000/24 = 41,67
				,exists:		"ignore" //  ignore / append / replace
			}
			,toString:		function() {
				return "[object CANVASIMG]";
			}
		};
		var oTransitions = {};
		//
		function newCanvasFor(img) {
			var oCanvas = document.createElement("canvas");
			oCanvas.width  = img.width;
			oCanvas.height = img.height;
			return oCanvas;
		}
		//
		function imageToCanvas(canvas,img) {
			var oReturn;
			if (img.constructor===String) {
				var mImg = document.createElement('img');
				mImg.setAttribute('src',img);
				mImg.onload = function(){
					 imageToCanvas(canvas,mImg);
				};
			} else {
				var oCtx = canvas.getContext("2d");
				var iW = oCtx.canvas.width;
				var iH = oCtx.canvas.height;
				oCtx.drawImage(img, 0,0,iW,iH);
				oReturn = oCtx;
			}
			return oReturn
		}
		//
		var iIdNrs = 0;
		function getIdFor(target) {
			iIdNrs++;
			var sId = "cimgid"+iIdNrs;
			target.setAttribute("id",sId);
			return sId;
		}
		//
		function toDataUrl(target,p) {
			switch (target.constructor) {
				case HTMLCanvasElement: case CanvasRenderingContext2D: break;
				case HTMLImageElement: target.setAttribute("src",p.canvas.toDataURL("image/jpeg")); break;// "image/jpeg" // "image/png"
				default: target.style.backgroundImage = "url("+p.canvas.toDataURL("image/jpeg")+")";
			}
		}
		//
		function removeTransition(target,end,callback) {
			var sId = target.getAttribute('id');
			var p = oTransitions[sId];
			if (p.timer) {
				clearInterval(p.timer);
				delete p.timer;
			}
			if (p.canvas!==undefined) {
				var oTargetContructor = target.constructor;
				if (oTargetContructor===HTMLCanvasElement) {
					if (end) imageToCanvas(p.canvas,p.toImg);
				} else {
					if (end) setTargetSrc(target,p.toImg.getAttribute('src'));
					else toDataUrl(target,p);
					if (!p.toDataURL) {
						if (oTargetContructor===HTMLImageElement) target.style.display = p.canvas.style.display;
						p.canvas.parentNode.removeChild(p.canvas);
					}
				}
			}
			callback&&p.callback&&p.callback();
			delete oTransitions[sId];
			return p;
		}
		//
		function setTargetSrc(target,src) {
			switch (target.constructor) {
				case HTMLImageElement: target.setAttribute('src',src); break;
				default: target.style.backgroundImage = "url("+src+")";
			}
		}
		//
		function getTargetSrc(target) {
			var sUri = ''
				,isImg = target.constructor===HTMLImageElement
				,sBgI = isImg?target.getAttribute('src'):target.style.backgroundImage;
			if (!isImg) {
				//var aUri = sBgI.match(/[a-z0-9:\.\/\?=_#&%~-]+/gi); // regex doesnt work for data:image/png;base64....
				//sUri = aUri[1];
				if (sBgI.substr(4,1)==="\"")	sUri = sBgI.substring(5,sBgI.length-2);
				else							sUri = sBgI.substring(4,sBgI.length-1);
			}
			return sUri;
		}
		//
		function tween(target,toImg,time,transition,tweenType,properties) {

			time = time===undefined?o.defaults.time:time;
			transition = transition||o.defaults.transition;
			tweenType = tweenType||o.defaults.tweenType;

			var oTargetContructor = target.constructor;

			// if canvas is not supported just replace and inmediately do the callback
			if (!supportsCanvas) {
				setTargetSrc(target,toImg.constructor===String?toImg:toImg.getAttribute('src'));
				properties.callback&&properties.callback();
				return false;
			}

			// if target and toImg have the same src's do nothing and do the callback
			if (oTargetContructor!==HTMLCanvasElement&&oTargetContructor!==CanvasRenderingContext2D) {
				var sTargetSrc = getTargetSrc(target)
					,sToimgSrc = toImg.constructor===String?toImg:toImg.getAttribute('src');
				if (sTargetSrc==sToimgSrc) {
					properties.callback&&properties.callback();
					return false;
				}
			}

			// duplicate the properties (to make sure the object is unique) and append with defaults
			var oProps = {
				extend: function(o) {
					for (var s in o) if (!this.hasOwnProperty(s)) this[s] = o[s];
					return this;
				}
			}.extend(properties).extend(o.defaults);

			// check if the target already has a transition running
			var sId = target.getAttribute('id')||getIdFor(target);
			if (oTransitions[sId]===undefined) {
				oTransitions[sId] = oProps;
			} else {
				switch (oProps.exists) {
					case "ignore": return false; break;
					case "append": return false; break; // todo: chain transitions
					case "replace":
						var oOldProps = removeTransition(target,false,true);
						// using toDataUrl takes some time, hence onload, and since onload does not work on css, we fake it
						var mFake = document.createElement("img");
						mFake.onload = function(){ tween(target,toImg,time,transition,tweenType,oProps); };
						toDataUrl(mFake,oOldProps);
						//setTimeout(function(e){ tween(target,toImg,time,transition,tweenType,props); },100);
						// toDataUrl causes the target height to plummet for a moment
						target.style.width = oOldProps.w+"px";
						target.style.height = oOldProps.h+"px";
						return false;
					break;
				}
			}
			//
			// check if toImg is a string or an img
			var mCnv;
			var oCtx;
			if (toImg.constructor===String) {
				removeTransition(target);
				var mImg = document.createElement('img');
				mImg.setAttribute('src',toImg);
				mImg.onload = function(){
					tween(target,mImg,time,transition,tweenType,oProps);
				}
				// todo: check why png files sometimes do not load
				return true;
			}
			// check the type of the target
			switch (oTargetContructor) {
				case HTMLImageElement:
					mCnv = newCanvasFor(target);
					oCtx = imageToCanvas(mCnv,target);
					if (!oProps.toDataURL) {
						target.parentNode.insertBefore(mCnv,target);
						// mimic and hide target
						for (var i=0;i<target.style.length;i++){
							var sStyle = target.style[i].replace('-value','');
							mCnv.style.setProperty(sStyle,target.style.getPropertyValue(sStyle),null);
						}
						target.style.display = 'none';
					}
				break;
				case HTMLCanvasElement:
					mCnv = target;
					oCtx = target.getContext("2d");
				break;
				case CanvasRenderingContext2D:
					mCnv = target.canvas;
					oCtx = target;
				break;
				default:
					if (oProps.backgroundImageContext) {
						mCnv = oProps.backgroundImageContext.canvas;
						oCtx = oProps.backgroundImageContext;
					} else {
						var mTempImg = document.createElement("img");
						var sUri = getTargetSrc(target);
						mTempImg.setAttribute("src",sUri);
						mTempImg.onload = function() {
							if (target.style.position!=="absolute") target.style.position = "relative";
							mCnv = newCanvasFor(mTempImg);
							if (!oProps.toDataURL) {
								mCnv.style.position = "absolute";
								mCnv.style.top = "0px";
								mCnv.style.left = "0px";
								mCnv.style.zIndex = 0;
								// the targets children should be above the canvas
								for (var i=0;i<target.children.length;i++) {
									var mChild = target.children[0];
									if (mChild.style.position!=="absolute") mChild.style.position = "relative";
									if (mChild.style.zIndex==='') mChild.style.zIndex = i+1;
								}
								if (target.children.length===0) target.appendChild(mCnv);
								else target.insertBefore(mCnv,target.children[0]);
							}
							oCtx = imageToCanvas(mCnv,mTempImg);
							oProps.backgroundImageContext = oCtx;
							tween(target,toImg,time,transition,tweenType,oProps);
						};
						removeTransition(target);
						return true;
					}
				break;
			}
			// we really start here
			var iW = mCnv.width;
			var iH = mCnv.height;
			//
			var mCnvFr = document.createElement("canvas");
			mCnvFr.width  = iW;
			mCnvFr.height = iH;
			var oCtxFr = mCnvFr.getContext("2d");
			oCtxFr.drawImage(mCnv, 0,0,iW,iH);
			//
			var mCnvTo = document.createElement("canvas");
			mCnvTo.width  = iW;
			mCnvTo.height = iH;
			var mCtxTo = mCnvTo.getContext("2d");
			toImg; // needed for Firefox buttonbashing (don't ask me why)
			mCtxTo.drawImage(toImg, 0,0,iW,iH);
			//
			var mCnvTmp = document.createElement("canvas");
			mCnvTmp.width  = iW;
			mCnvTmp.height = iH;
			var mCtxTmp = mCnvTmp.getContext("2d");
			//
			// assemble props that are parsed
			oProps.toImg = toImg;
			oProps.r = Math.ceil(.5*Math.sqrt(iW*iW+iH*iH));
			oProps.w = mCnv.width;
			oProps.h = mCnv.height;
			oProps.seed = Math.round(2147483647*Math.random());
			oProps.canvas = mCnv;
			oProps.context = oCtx;
			oProps.canvasFrom = mCnvFr;
			oProps.canvasTo = mCnvTo;
			oProps.contextTmp = mCtxTmp;
			oProps.apply = function(composite,isfrom) {
				if (isfrom) this.context.clearRect(0,0,this.w,this.h);
				this.contextTmp.globalCompositeOperation = composite||"source-in";
				this.contextTmp.fillStyle = this.contextTmp.createPattern(isfrom?this.canvasFrom:this.canvasTo, 'no-repeat');
				this.contextTmp.fillRect(0,0,this.w,this.h);
				this.contextTmp.globalCompositeOperation = "source-over";
				this.context.drawImage(this.contextTmp.canvas, 0,0,this.w,this.h);
				if (!isfrom) this.contextTmp.clearRect(0,0,this.w,this.h);
				return this;
			};
			//
			// the actual transition in time
			if (transition.init) transition.init(oProps);
			oProps.tstart = new Date().getTime();
			oProps.timer = setInterval(function(){
				var iTcurrent = new Date().getTime();
				var iTime = (iTcurrent-oProps.tstart)/time;
				oProps.t = tweenType(iTime);
				if (iTime<1) {
					// draw from
					if (transition.from) transition.from(oProps);
					else oCtx.drawImage(mCnvFr, 0,0,iW,iH);
					// draw to
					if (transition.to) transition.to(oProps);
					else oCtx.drawImage(mCnvTo, 0,0,iW,iH);
					// skip canvas
					if (oProps.toDataURL) toDataUrl(target,oProps);
				} else if (iTime>=1) { // the end
					removeTransition(target,true,true);
				}
			},oProps.frameRate);
			return true;
		}
		// disclose functions
		o.set = imageToCanvas;
		o.tween = tween;
		return o;
	}();
	////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////
	//
	// TRANSITIONS
	//
	// fade
	CIMG.defaults.transition = CIMG.transition.fade = function(){
		return {
			to: function(p){
				p.context.globalAlpha = p.t;
				p.context.drawImage(p.canvasTo, 0,0,p.w,p.h);
				p.context.globalAlpha = 1;
			}
		};
	}();
	// zoom
	CIMG.transition.zoom = function(){
		return {
			init:function(p){
				p.extend({
					scale: 5
				});
			},from: function(p){
				var s = 1+p.scale*p.t;
				p.context.drawImage(p.canvasFrom, -.5*(s-1)*p.w,-.5*(s-1)*p.h,s*p.w,s*p.h);
			},to: function(p){
				p.context.globalAlpha = p.t;
				var s = 1+p.scale*(1-p.t);
				p.context.drawImage(p.canvasTo, -.5*(s-1)*p.w,-.5*(s-1)*p.h,s*p.w,s*p.h);
				p.context.globalAlpha = 1;
			}
		}
	}();
	// wipe
	CIMG.transition.wipe = function(){
		return {
			init: function(p){
				p.extend({
					direction: "r" // t, r, b, l
				})
			},to: function(p){
				switch (p.direction) {
					case "t": p.context.drawImage(p.canvasTo, 0,-(1-p.t)*p.h,p.w,p.h); break;
					case "b": p.context.drawImage(p.canvasTo, 0,(1-p.t)*p.h,p.w,p.h); break;
					case "l": p.context.drawImage(p.canvasTo, -(1-p.t)*p.w,0,p.w,p.h); break;
					case "r": p.context.drawImage(p.canvasTo, (1-p.t)*p.w,0,p.w,p.h); break;
				}
			}
		}
	}();
	// fold
	CIMG.transition.fold = function(){
		return {
			init: function(p){
				p.extend({
					 direction: "r" // t, r, b, l
					,linear: false
					,shadow: .3
				})
			},from: function(p){
				var bTL = p.direction==="l"||p.direction==="t";
				p.context.drawImage(bTL?p.canvasTo:p.canvasFrom, 0,0,p.w,p.h, 0,0,p.w,p.h);
				switch (p.direction) {
					case "t": case "b":	p.context.drawImage(bTL?p.canvasFrom:p.canvasTo,	0,p.h/2,p.w,p.h/2, 0,p.h/2,p.w,p.h/2); break;
					case "l": case "r": p.context.drawImage(bTL?p.canvasFrom:p.canvasTo,	p.w/2,0,p.w/2,p.h, p.w/2,0,p.w/2,p.h); break;
				}
			},to: function(p){
				var bHr = p.direction==="l"||p.direction==="r";
				var bTL = p.direction==="l"||p.direction==="t";
				var t = bTL?1-p.t:p.t;
//				var t = Math.min(Math.max(bTL?1-p.t:p.t,.0000001,.999999999);
				var bSide = p.linear?t:t<.5;
				var fSinT = .5*(Math.sin((t-.5)*Math.PI)+1);
				var x;
				var y;
				var w;
				var h;
				switch (p.direction) {
					case "t": case "b":
						x = 0;
						y = (bSide?.5:1-fSinT)*p.h;
						w = p.w;
						h = Math.abs(.5-fSinT)*p.h;
					break;
					case "l": case "r":
						x = (bSide?.5:1-fSinT)*p.w;
						y = 0;
						w = Math.abs(.5-fSinT)*p.w;
						h = p.h;
					break;
				}
				p.context.drawImage(bSide!==bTL?p.canvasFrom:p.canvasTo,  (bHr?1:0)*(bSide?.5:0)*p.w,(bHr?0:1)*(bSide?.5:0)*p.h,(bHr?.5:1)*p.w,(bHr?1:.5)*p.h,  x,y,w,h);
				if (p.shadow!==0) {
					var fAlpha = Math.min(Math.max(p.shadow*(.5-Math.abs(.5-fSinT)),1),0);
					p.context.fillStyle = bSide===bHr?'rgba(0,0,0,'+fAlpha+')':'rgba(255,255,255,'+fAlpha+')';
					p.context.fillRect(x,y,w,h);
				}
			}
		}
	}();
	// flip
	CIMG.transition.flip = function(){
		return {
			init: function(p){
				p.extend({
					 vertical: false
					,linear: false
					,shadow: .3
				})
			},from: function(p){
				p.context.clearRect(0,0,p.w,p.h);
			},to: function(p){
				var bHalf = p.t<.5;
				var fSinT = .5*(Math.sin((p.t-.5)*Math.PI)+1);
				//var t = (p.linear?p.t:fSinT)*(bHalf?1:-1)+(bHalf?0:1);
				var x = (p.vertical?0:p.t)*p.w;
				var y = (p.vertical?p.t:0)*p.h;
				var w = (p.vertical?1:1-p.t*2)*p.w;
				var h = (p.vertical?1-p.t*2:1)*p.h;
				p.context.drawImage( bHalf?p.canvasFrom:p.canvasTo, x,y,w,h);
				if (p.shadow>0) { // todo: not right yet (probably use t)
					var fAlpha = p.shadow*(.5-Math.abs(.5-fSinT));
					p.context.fillStyle = bHalf===p.vertical?'rgba(0,0,0,'+fAlpha+')':'rgba(255,255,255,'+fAlpha+')';
					p.context.fillRect(x,y,w,h);
				}
			}
		}
	}();
	// pageflip
	CIMG.transition.pageflip = function(){
		return {
			init: function(p){
				p.extend({
					shadow: .3
				})
			},from: function(p){
//				oCtx.drawImage(mCnvFr, 0,0,iW,iH);
				p.context.clearRect(0,0,p.w,p.h);
			},to: function(p){
				var x = (1-p.t)*p.w;
				var y = .5*Math.sin(p.t*Math.PI)*p.h;
				//
//  				p.context.save();
				//
//				p.context.restore();;
//				p.context.closePath();
				p.context.beginPath();
				p.context.lineTo(p.w,0);
//				p.context.beginPath()
				p.context.moveTo(x,y);
				//
				p.context.lineWidth = 1;
				p.context.strokeStyle = '#000';
				p.context.stroke();
				p.context.closePath();

				p.context.fillRect(x,y,2,2);
//				p.context.restore();
				//
//				p.apply();
			}
		}
	}();
	// circle
	CIMG.transition.circle = function(){
		return {
			init: function(p){
				p.extend({
					 grow: true
					,fade: 100
				});
			},to: function(p){
				var x = p.w/2;
				var y = p.h/2;
				var r = Math.max(0,(p.grow?p.t:1-p.t)*(p.r+p.fade));
				p.contextTmp.beginPath();
				//
				if (p.fade===0) {
					p.contextTmp.fillStyle = '#f00';
				} else {
					var oGrad = p.contextTmp.createRadialGradient(x,y,0,x,y,r);
					oGrad.addColorStop(p.r/(p.r+p.fade), '#000');
					oGrad.addColorStop(1, 'rgba(0,0,0,0)');
					p.contextTmp.fillStyle = oGrad;
				}
				p.contextTmp.arc(x,y,r,0,2*Math.PI, false);
				p.contextTmp.closePath();
				p.contextTmp.fill();
				p.apply(p.grow?"source-in":"source-out");
			}
		}
	}();
	// square
	CIMG.transition.square = function(){
		return {
			init:function(p){
				p.extend({
					grow: true
				});
			},to: function(p){
				var t = p.grow?p.t:1-p.t;
				var w = t*p.w;
				var h = t*p.h;
				var x = (p.w-w)/2;
				var y = (p.h-h)/2;
				p.contextTmp.beginPath();
				p.contextTmp.fillStyle = '#f00';
				// todo: if gradient: draw four triangles with linearGradient
				p.contextTmp.fillRect(x,y,w,h);
				p.contextTmp.closePath();
				p.contextTmp.fill();
				p.apply(p.grow?"source-in":"source-out");
			}
		}
	}();
	// clock
	CIMG.transition.clock = function(){
		return {
			init:function(p){
				p.extend({
					 clockwise: true
					,startAngle: 0
				});
			},to: function(p){
				var fRdnStart = (p.startAngle/180-.5)*Math.PI;
				p.contextTmp.beginPath();
				p.contextTmp.moveTo(Math.floor(p.w/2),Math.floor(p.h/2));
				p.contextTmp.arc(Math.floor(p.w/2),Math.floor(p.h/2),p.r,fRdnStart,fRdnStart+(p.clockwise?1:-1)*(p.t)*2*Math.PI, false);
				p.contextTmp.closePath();
				p.contextTmp.fill();
				p.apply(p.clockwise?"source-in":"source-out");
			}
		}
	}();
	// wave
	CIMG.transition.wave = function(){
		return {
			to:function(p){
				var x = (1-2*p.t)*p.w;
				p.contextTmp.beginPath();
				p.contextTmp.moveTo(x,p.h);
				p.contextTmp.bezierCurveTo(x+p.w*.5,p.h, x+p.w*.5,0, x+p.w,0);
				p.contextTmp.lineTo(x+p.w*2,0);
				p.contextTmp.lineTo(x+p.w*2,p.h);
				p.contextTmp.closePath();
				p.contextTmp.fill();
				p.apply();
			}
		}
	}();
	// blinds
	CIMG.transition.blinds = function(){
		return {
			init:function(p){
				p.extend({
					 number:	16
					,even:		.9
					,rotation:	.2*Math.PI
				});
			},to: function(p){
				//p.rotation += .01;
				var iRmxBlind = 2*p.r/p.number;
				p.contextTmp.translate(p.w/2, p.h/2);
				p.contextTmp.rotate(p.rotation);
				for (var i=0;i<p.number;i++) {
					var fTT = Math.min(Math.max(   p.even*(p.t) + (1-p.even)*((p.t)*p.number-i)   ,0),1);
					p.contextTmp.fillRect(-p.r,-p.r+Math.round(iRmxBlind/2+i*iRmxBlind-fTT*iRmxBlind/2),2*p.r,Math.ceil(fTT*(iRmxBlind+.1)));
				}
				p.contextTmp.rotate(-p.rotation);
				p.contextTmp.translate(-p.w/2, -p.h/2);
				//
				p.apply();
			}
//			},from: function(p){
//				//p.rotation += .01;
//				var iRmxBlind = 2*p.r/p.number;
//				p.contextTmp.translate(p.w/2, p.h/2);
//				p.contextTmp.rotate(p.rotation);
//				for (var i=0;i<p.number;i++) {
//					var fTT = Math.min(Math.max(   p.even*(p.t) + (1-p.even)*((p.t)*p.number-i)   ,0),1);
//					p.contextTmp.fillRect(-p.r,-p.r+Math.round(iRmxBlind/2+i*iRmxBlind-fTT*iRmxBlind/2),2*p.r,Math.ceil(fTT*(iRmxBlind+.1)));
//				}
//				p.contextTmp.rotate(-p.rotation);
//				p.contextTmp.translate(-p.w/2, -p.h/2);
//				////////////////////
//				p.apply("xor",true);
//			},to: function(p){
//				p.apply("xor");
//			}
		}
	}();
	// particles
	CIMG.transition.particles = function(){
		// todo: add property for parsing an image to use as particle
		return {
			init:function(p){
				p.extend({
					 number: 128
					,scale: 1
					,character: "*"
					,font: "Verdana"
				});
				// since fillText is rather slow we temporarily store the particle image
				var iShot = Math.floor(.6*p.h);
				p.contextTmp.font = iShot+'px '+p.font;
				p.contextTmp.textBaseline = "middle";
				//
				p.mTCnv = document.createElement("canvas");
				p.mTCnv.width = p.w;
				p.mTCnv.height = p.h;
				p.mTCtx = p.mTCnv.getContext("2d");
				p.mTCtx.font = p.contextTmp.font;
				p.mTCtx.textBaseline = "middle";
				p.mTCtx.fillText(p.character,p.w/4,p.h/3);
				//
				// find character constraints (since p.contextTmp.measureText(p.character) sucks)
				var iFindWH = 8;
				var aFindWH = [];
				var mFindCnv;
				for (var k=0;k<2;k++) {
					mFindCnv = p.mTCnv;
					var bW = k===0;
					for (var i=iFindWH;i>=1;i/=2) {
						var mFCnv = document.createElement("canvas");
						mFCnv.width =	bW?p.w:i;
						mFCnv.height =	bW?i:p.h;
						var mFCtx = mFCnv.getContext("2d");
						mFCtx.drawImage(mFindCnv, 0,0, bW?p.w:i,bW?i:p.h);
						if (i>1) {
							mFindCnv = mFCnv;
						} else {
							var mFDta = mFCtx.getImageData(0,0, bW?p.w:i,bW?i:p.h);
							var iStart = undefined;
							var iEnd = undefined;
							for (var j=0;j<mFDta.data.length/4;j++) {
								var iAlpha = mFDta.data[j*4+3];
								if (iAlpha!==0&&iStart===undefined)	iStart = Math.max(0,j-1);
								if (iAlpha===0&&iEnd===undefined)	iEnd = j;
								else if (iAlpha!==0)				iEnd = undefined;
							}
							aFindWH.push(iStart);
							aFindWH.push(iEnd);
						}
					}
				}
				var iMrg = 0;
				var iRsX = aFindWH[0]||0;
				var iRsY = aFindWH[2]||0;
				var iRsW = Math.max(1,(aFindWH[1]-aFindWH[0])||1);
				var iRsH = Math.max(1,(aFindWH[3]-aFindWH[2])||1);
				var mResult = document.createElement("canvas");
				mResult.width =  iRsW+2*iMrg;
				mResult.height = iRsH+2*iMrg;
				var mRsltCtx = mResult.getContext("2d");
				mRsltCtx.drawImage(p.mTCnv, iRsX,iRsY,iRsW,iRsH, iMrg,iMrg,iRsW,iRsH);
				p.mTCnv = mResult;
			},to: function(p){
				var iNumParticles = p.number;
				Prng.seed = p.seed;
				for (var i=0;i<iNumParticles;i++) {
					var iPx = p.w*(iNumParticles===1?.5:Prng.random());
					var iPy = p.h*(iNumParticles===1?.5:Prng.random());
					var iSze = Math.max(0,(p.t)*p.r/Math.sqrt(iNumParticles)*1.5);
					var iT1SzW = iSze * p.mTCnv.width * .02 * p.scale;
					var iT1SzH = iSze * p.mTCnv.height * .02 * p.scale;
					iPx -= iT1SzW/2;
					iPy -= iT1SzH/2;
					p.contextTmp.drawImage(p.mTCnv, iPx,iPy, iT1SzW,iT1SzH);
				}
				p.apply();
			}
		}
	}();
	// noise
	CIMG.transition.noise = function(){
		return {
			init:function(p){
				Prng.seed = p.seed;
				p.noise = [];
				for (var i=0;i<p.w*p.h;i++) p.noise.push(Prng.random());
				p.contextTmp.fillRect(0,0,p.w,p.h);
				p.imgdata = p.contextTmp.getImageData(0,0,p.w,p.h);
				p.pixels = p.imgdata.data;
			},to: function(p){ // todo: this should be possible to do without looping through pixels the whole time.... with some sort of composite stuff
				for (var i=0;i<p.pixels.length/4;i++) p.pixels[4*i+3] = p.noise[i]>p.t?0:255;
				p.contextTmp.putImageData(p.imgdata, 0,0);
				p.apply();
			}
		};
	}();
	// simplexNoise
	CIMG.transition.simplexNoise = function(){
		return {
			init:function(p){
				assert(PerlinSimplex,'You need to include PerlinSimplex.js');
				p.extend({
					 scaleX:	.02
					,scaleY:	.02
					,fade:		.3
				});
				Prng.seed = p.seed;
				p.noise = [];
				var x1 = Prng.rnd();
				var y1 = Prng.rnd();
				for (var i=0;i<p.w*p.h;i++) {
					var x = x1+p.scaleX*(i%p.w);
					var y = y1+p.scaleY*Math.floor(i/p.w);
					p.noise.push(PerlinSimplex.noise(x,y));
				}
				p.contextTmp.fillRect(0,0,p.w,p.h);
				p.imgdata = p.contextTmp.getImageData(0,0,p.w,p.h);
				p.pixels = p.imgdata.data;
			},to: function(p){ // todo: this should be possible to do without looping through pixels the whole time.... with some sort of composite stuff
				for (var i=0;i<p.pixels.length/4;i++) {
					var t = -.5*p.fade + p.t*(1+p.fade);
					p.pixels[4*i+3] = 255*Math.min(Math.max((t-(p.noise[i]-.5*p.fade))*(1/p.fade),0),1);
				}
				p.contextTmp.putImageData(p.imgdata, 0,0);
				p.apply();
			}
		}
	}();
	// drip
	CIMG.transition.drip = function(){
		return {
			init:function(p){
				assert(PerlinSimplex,'You need to include PerlinSimplex.js');
				p.extend({
					 scaleX:	.02
					,scaleY:	.0002
					,fade:		.3
				});
				p.contextTmp.fillRect(0,0,p.w,p.h);
				p.imgdata = p.contextTmp.getImageData(0,0,p.w,p.h);
				p.pixels = p.imgdata.data;
				//
				p.noise = [];
				Prng.seed = p.seed;
				var x1 = Prng.rnd();
				var y1 = Prng.rnd();
				for (var i=0;i<p.w*p.h;i++) {
					var x = i%p.w;
					var y = Math.floor(i/p.w);
					var xx = x1+p.scaleX*x;
					p.noise.push((y/p.h)*PerlinSimplex.noise(xx));
				}
			},to: function(p){ // todo: this should be possible to do without looping through pixels the whole time.... with some sort of composite stuff
				for (var i=0;i<p.pixels.length/4;i++) {
					var t = -.5*p.fade + p.t*(1+p.fade);
					p.pixels[4*i+3] = 255*Math.min(Math.max((t-(p.noise[i]-.5*p.fade))*(1/p.fade),0),1);
				}
				p.contextTmp.putImageData(p.imgdata, 0,0);
				p.apply();
			}
		}
	}();
	CANVASIMG = CIMG;
}
// a psuedo random number generator for the particle transition
if (!Prng) {
	var Prng = function() {
		var iMersenne = 2147483647;
		var iRnd = function(seed) {
			if (arguments.length) oReturn.seed = arguments[0];
			oReturn.seed = oReturn.seed*16807%iMersenne;
			return oReturn.seed;
		};
		var oReturn = {
			seed: 123,
			rnd: iRnd,
			random: function(seed) {
				if (arguments.length) oReturn.seed = arguments[0];
				return iRnd()/iMersenne;
			}
		};
		return oReturn;
	}();
}
// extra array fn
Array.prototype.indexOf=function(n){for(var i=0;i<this.length;i++){if(this[i]===n){return i;}}return -1;};


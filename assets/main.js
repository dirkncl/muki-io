function ctxAudio(){return new AudioContext};
var CtxAudio;
function e(url,t,n){
  if("function"==typeof t)
    var n=t,
        t={};
  "chrome-extension:"==window.location.protocol&&(url=default_host+url),
  //url.match(/\.(pat|data|bin|sf2)$/i)&&(url=url.replace("https://","http://"));
  url.match(/\.(pat|data|bin|sf2)$/i);
  var r=t.progress_cb;
  var i=new XMLHttpRequest;
  return (
    i.open("GET",url,!0),
    i.setRequestHeader("X-Accept-Ranges","bytes"),
    t.responseType&&(i.responseType=t.responseType),
    i.onerror=n,
    i.onload=function(){
      n(null,i.status,i.response,i.getResponseHeader("content-type"))
    },
    r&&
    (
      i.onprogress=function(file){
        var percent=file.loaded/file.total*100>>0;
        r({
          loaded:file.loaded,
          total:file.total,
          percent:percent
        })
      }
    ),
    i.send(),
    i
  )
}
function t(t,n){
  var o={},
      a=t.length;

  function r(e,t,r){
    --a||n(o)
  }
  function i(t){
    e(t,function(e,n,i){o[t]=i,r()})
  }
  t.forEach(i)

}
function n(e){
  var t={},
      n=[].slice;
  return (
    e.on=function(n,r){
      return (
        "function"==typeof r&&n.replace(/[^\s]+/g,function(e,n){(t[e]=t[e]||[]).push(r),r.typed=n>0}),
        e
      )
    },
    e.off=function(n){
      return (
        n.replace(/[^\s]+/g,function(e){t[e]=[]}),
        "*"==n&&(t={}),
        e
      )
    },
    e.once=function(t,n){
      return (
        n&&(n.one=!0),
        e.on(t,n)
      )
    },
    e.trigger=function(r){
      var i,
          o=n.call(arguments,1),
          a=t[r]||[];
      for(var s=0;i=a[s];++s)
        i.busy||
        (
          i.busy=!0,
          i.apply(e,i.typed?[r].concat(o):o),
          i.one&&(a.splice(s,1),s--),
          i.busy=!1
        )
        return e
    },
    e
  )
}

function r(dataBuffer,tval,n){
  var tipe={mt32:0,gm:1,gs:2},
      FileLibmidconvJS="./js/lib/libmidconv.js",
      tmpBuffer={};

  "undefined"==typeof MidConvertModule?
    A(FileLibmidconvJS,ConvertFile)
  :
    ConvertFile()

  function ConsoleLog(info){
    console.log("[MidConvert] "+info)
  }
  function ex(){
    return (
      70==dataBuffer[0]&&
      79==dataBuffer[1]&&
      82==dataBuffer[2]&&
      77==dataBuffer[3]?
        "xmi"
      :
        77==dataBuffer[0]&&
        85==dataBuffer[1]&&
        83==dataBuffer[2]?
          "mus"
        :
          void 0
    )
  }
  function ConvertFile(){
    var MCM=MidConvertModule;
    Module=null,
    tmpBuffer.input=MCM._malloc(dataBuffer.length),
    MCM.writeArrayToMemory(dataBuffer,tmpBuffer.input),
    tmpBuffer.len=MCM._malloc(3);
    var ext=ex();
    if("xmi"==ext)
      var l=tipe[tval];
    else{
      if("mus"!=ext)
        throw new Error("Invalid format: "+ext);
      var l=140
    }
    ConsoleLog("Converting "+dataBuffer.length+" bytes in "+ext+" format to MIDI"),
    tmpBuffer.out=MCM.ccall(ext+"2midi","number",["number","number","number","number"],[tmpBuffer.input,dataBuffer.length,tmpBuffer.len,l]);
    var MidiLength=MCM.getValue(tmpBuffer.len,"i16");
    ConsoleLog("Output MIDI length: "+MidiLength),
    0>MidiLength&&(ConsoleLog("Decoding seems to have failed. Crossing our fingers and continuing anyway..."),MidiLength=-1*MidiLength);
    var MidiArray=new Int8Array(MidiLength);
    for(var cnt=0;MidiLength>cnt;cnt++){
      var d=MCM.getValue(tmpBuffer.out+cnt);
      MidiArray[cnt]=d
    }
    Object.keys(tmpBuffer).forEach(function(ptr){
      ConsoleLog("Unloading pointer: "+ptr),
      MCM._free(tmpBuffer[ptr]),
      tmpBuffer[ptr]=null
    }),
    dataBuffer=null,
    n(MidiArray)
  }
}
//////////////////////////////

function n(e){
  var t={},
      n=[].slice;
  return (
    e.on=function(n,r){return"function"==typeof r&&n.replace(/[^\s]+/g,function(e,n){(t[e]=t[e]||[]).push(r),r.typed=n>0}),e},
    e.off=function(n){return n.replace(/[^\s]+/g,function(e){t[e]=[]}),"*"==n&&(t={}),e},
    e.once=function(t,n){return n&&(n.one=!0),e.on(t,n)},
    e.trigger=function(r){for(var i,o=n.call(arguments,1),a=t[r]||[],s=0;i=a[s];++s)i.busy||(i.busy=!0,i.apply(e,i.typed?[r].concat(o):o),i.one&&(a.splice(s,1),s--),i.busy=!1);return e},
    e.emit=e.trigger,
    e
  )
};

function u(e,t,n,r){
  X+=1;
  var i=W[X]={id:X,cb:r,length:e,decay:t,reverse:n,impulseL:new Float32Array(e),impulseR:new Float32Array(e)};
  return (
    z.push([i.id,0,Math.min(G,e)]),
    setTimeout(l,1),
    X
  )
};
function l(){
  var e=z.shift();
  if(e){
    var t=W[e[0]];
    if(t){
      for(var n=t.length,r=t.decay,i=t.reverse,o=e[1],a=e[2],s=t.impulseL,u=t.impulseR,c=o;a>c;c++){
        var f=i?n-c:c;
        s[c]=(2*Math.random()-1)*Math.pow(1-f/n,r),
        u[c]=(2*Math.random()-1)*Math.pow(1-f/n,r)
      }
      a>=n-1?
        (
          delete W[e[0]],
          t.cb([t.impulseL,t.impulseR])
        )
      :
        z.push([t.id,a,Math.min(a+G,n)])
    }
  }
  z.length&&setTimeout(l,5)
};
function c(e){
  var t=e.createGain(),
      n=t._dry=e.createGain(),
      r=t._wet=e.createGain(),
      i=t.output=e.createGain(),
      o=t._convolver=e.createConvolver(),
      a=t._filter=e.createBiquadFilter();
  return (
    t.connect(n),
    t.connect(r),
    o.connect(a),
    n.connect(i),
    r.connect(o),
    a.connect(i),
    
    Object.defineProperties(t,Y),
    t._time=3,
    t._decay=2,
    t._reverse=!1,
    t.cutoff.value=2e4,
    t.filterType="lowpass",
    t._building=!1,
    t._buildImpulse(),
    t
  )
};
function f(e,t,n){
  return (
    "undefined"==typeof n&&(n=e.byteLength-t),
    new DataView(e.buffer,e.byteOffset+t,n)
  )
};
function h(e,t,n,r){
  var i=0;
  if("undefined"==typeof r&&(r=e.byteLength-t),n)
    for(var o=r-1;o>=0;--o)
      i=(i<<8)+e.getUint8(t+o);
  else 
    for(var o=0;r>o;++o)
      i=(i<<8)+e.getUint8(t+o);
  return i
};
function d(e,t){
  for(var n=0,r=0;;){
    var i=e.getUint8(t+r);
    ++r;
    var o=128&i,
        a=127&i;
    if(n=(n<<7)+a,!o)
      break
  }
  return{
    value:n,
    byteLength:r
  }
};
function p(e,t,n){
  if("function"==typeof t)
    var n=t,
        t={};
  "chrome-extension:"==window.location.protocol&&(e=default_host+e),
  e.match(/\.(pat|data|bin|sf2)$/i)&&(e=e.replace("https://","http://"));
  var r=t.progress_cb,
  i=new XMLHttpRequest;
  return (
    i.open("GET",e,!0),
    i.setRequestHeader("X-Accept-Ranges","bytes"),
    t.responseType&&(i.responseType=t.responseType),
    i.onerror=n,
    i.onload=function(){
      n(null,i.status,i.response,i.getResponseHeader("content-type"))
    },
    r&&
    (
      i.onprogress=function(e){
        var t=e.loaded/e.total*100>>0;
        r({
          loaded:e.loaded,
          total:e.total,
          percent:t
        })
      }
    ),
    i.send(),
    i
  )
};
var m=function(e,t,n){
  var r=this;
  this.onchange=null,
  this.xRot=0,
  this.yRot=0,
  this.scaleFactor=3,
  this.dragging=!1,
  this.curX=0,
  this.curY=0,
  t&&(this.canvas_=t),
  n&&(this.context_=n),
  e.onmousedown=function(e){r.curX=e.clientX,r.curY=e.clientY;var t=!1;if(r.canvas_&&r.context_){var n=r.canvas_.getBoundingClientRect(),i=e.pageX-n.left,o=e.pageY-n.top,a=r.canvas_.width,s=r.canvas_.height;if(i>0&&a>i&&o>0&&s>o){var u=r.context_.readPixels(i,s-o,1,1,r.context_.RGBA,r.context_.UNSIGNED_BYTE);u&&u[3]>25.5&&(t=!0)}}else t=!0;r.dragging=t},
  e.onmouseup=function(e){r.dragging=!1},
  e.onmousemove=function(e){if(r.dragging){var t=e.clientX,n=e.clientY,i=(r.curX-t)/r.scaleFactor,o=(r.curY-n)/r.scaleFactor;r.curX=t,r.curY=n,r.yRot=(r.yRot+i)%360,r.xRot=r.xRot+o,r.xRot<-90?r.xRot=-90:r.xRot>90&&(r.xRot=90),null!=r.onchange&&r.onchange(r.xRot,r.yRot)}}
};

//////////////////////////
function w(e){
  var t=[],
      n=["audio/midi-adlib","audio/midi-sf2","audio/midi-mt32","audio/midi-mt32-gm"];
  e.forEach(function(e){
    if("audio/midi"||"audio/x-midi"!=e.type)
      return t.push(e);
    for(var r in n)
      t.push({
        name:e.name,
        data:e.data,
        lib:e.lib,
        type:n[r]
      })
  }),
  this.songs=t,
  this.index=0
}

function MidiBufferInput(Buffer){
  var EmptyArray=function(){
    return[]
  };
  function MidiEvents(){
    if(!midiBuffer)
      try{
        var midiBuffer=Ye.load(Buffer)

        ////////////////////////////
        lyricsDisplayer.loadLyrics(midiBuffer.getLyrics());
        //console.log(midiBuffer.getLyrics());
        document.getElementById('lyricButton').style.display="none";
        document.getElementById('pane').style.display="none";
        if(midiBuffer.getLyrics().length>10) {
          document.getElementById('pane').style.display="block";
          document.getElementById('lyricButton').style.display="block";
          
        }
        else {
          document.getElementById('pane').style.display="none";
          document.getElementById('lyricButton').style.display="none";
        };
        ////////////////////////////
        
      }
      catch(err){
        return (
          console.log("MIDI had errors, so skipping",err),

          {
            getEvents:EmptyArray,
            getMidiEvents:EmptyArray
          }
        )
      }
    return midiBuffer
  }
  var midiEvents=MidiEvents();
  function length(){
    var midiEvn=midiEvents.getMidiEvents(),
        nn=midiEvn[midiEvn.length-1],
        rr=nn?nn.playTime+1:0;
    return rr/1e3
  }
  function title(){
    var evMeta=midiEvents.getEvents(Ye.Events.EVENT_META),
        evMetaMap=evMeta.map(function(ev){
          if(ev.subtype==Ye.Events.EVENT_META_TRACK_NAME){
            var str=ev.data.map(function(cc){
                  return String.fromCharCode(cc)
                });
            return str.join("").trim()
          }
        }).filter(
          function(es){
            return!!es
          });
    return evMetaMap.join(" ")
  }
  function tempo(){
    var evMeta=midiEvents.getEvents(Ye.Events.EVENT_META),
        tpo=evMeta.filter(function(ev){
            return ev.tempo?ev:void 0
          });
    return tpo[0]&&tpo[0].tempoBPM
  }
  function evSysex(){
    return midiEvents.getEvents(Ye.Events.EVENT_SYSEX)
  }
  function mtDt(dt){
    return [dt[0],dt[1],dt[2]].map(function(ev){
      return(ev||0).toString(16)
    })
  }
  function is_mt32(){
    var sysx=evSysex();
    return (
      0==sysx.length?
        !1
      :
        sysx.some(function(ev){
          var mt=mtDt(ev.data);
          return-1!=mt.join(" ").indexOf("41 10 16")
        })
    )
  }
  
  return {
    data:Buffer,
    length:length,
    tempo:tempo,
    title:title,
    is_mt32:is_mt32
  }
}

function Alert(){alert("Muki requires a modern version of Chrome, Safari or Firefox.")}
function _(){return ot?console.log("Already recording!"):tt.source?(console.log("Initializing recorder.",tt.source),ot=new Recorder(tt.source,{workerPath:"./js/recorderWorker.js"}),ot.started_at=new Date,void ot.record()):console.log("No audio source set!")}
function C(){if(!ot)return console.log("Not recording!");var e=new Date,t=Math.ceil((e-ot.started_at)/1e3),n="rec-output-"+t+"s-"+(new Date).getTime()+".wav";console.log("Saving recorded audio. Got "+t+" seconds."),ot.exportWAV(function(e){Recorder.forceDownload(e,n),ot.clear(),ot=null})}

function S(){
  function e(e){console.warn("[filedropper] "+e)}
  function t(e){console.log("[filedropper] "+e)}
  var n=["pdx","psflib","syx"];
  Oe.load({show:"over"}),
  Oe.register(
    ["*"],
    function(r){
      function i(){
        var t=o(c.songs);
        if(t=a(t),t.length<1)
          return e("No (valid) songs received. Cannot continue.");
        var n=nt?
              new w(t)
            :
              new y(t,"name");
        Je.hit_play(n),
        Ge.toggle_menu(!1)
      }
      function o(e){
        var t=[];
        return (
          e.map(function(e){
            e.name.toLowerCase().indexOf("syx")>-1&&t.push(e)
          }),
          1==t.length&&
          (
            console.warn("Sysex file dropped!",t[0].name),
            e.forEach(function(e){
              "audio/midi-mt32"!=e.type||e.lib||(e.lib=t[0].name.toLowerCase())
            })
          ),
          e
        )
      }
      function a(r){
        var i={};
        return (
          r.forEach(function(e){
            i[e.name.toLowerCase()]=e
          }),
          r.map(function(r){
            return (
              -1==n.indexOf(s(r.name))?
                (
                  r.lib&&
                  (
                    i[r.lib]?
                      (t("Found lib "+r.lib+" for song "+name),r.lib=i[r.lib])
                    :
                      e("Song uses lib named "+r.lib+", but not present.")
                  ),
                  r
                )
              :
                void 0
            )
          }).filter(function(e){
            return!!e
          })
        )
      }
      function s(e){
        return(e||"").split(".").pop().toLowerCase()
      }
      function u(){
        --c.count||i()
      }
      function l(e,t,n){
        var r=new FileReader;
        r.onload=function(r){
          var i=r.target.result,
              o=Je.detect_song_type(e.name,t,i,n);
          c.songs.push(o),u()
        },
        r.readAsArrayBuffer(e)
      }
      for(var c={songs:[],count:r.length},f=0;f<r.length;f++){
        var h=r[f],
            d=!1,
            p=Ue.guess((h.name||"").toLowerCase());
        p||"text/plain"!=h.type?
          (
            "audio/vgz"==p&&(p="audio/vgm",d=!0),
            He.backends[p]||-1!=n.indexOf(s(h.name))?
              l(h,p,d)
            :
              (e("Unsupported type: "+p),u())
          )
        :
          (e("Text dropped to window. MML is not supported yet!"),u())
      }
    }
  )
}
/*
function loadScript(txt){
  var scr=documentCreateElement('script');
  scr.innerText=txt;
  document.getElementsByTagName('head')[0].appendChild(scr);
}
*/
var A=function(){
  var e=[];
  return function(t,n){
    if(-1!==e.indexOf(t))return n&&n();
    e.push(t);
    var r=document.getElementsByTagName("script")[0],
    i=document.createElement("script");
    i.onreadystatechange=function(){
      ("loaded"===i.readyState||"complete"===i.readyState)&&(i.onreadystatechange=null,n())
    },
    i.onload=function(){n()},
    i.onerror=function(e){n(e)},
    "chrome-extension:"==location.protocol&&(t=default_host+t),
    i.src=t,
    i.type="text/javascript",
    r.parentNode.insertBefore(i,r)
  }
}(this);
//"object"==typeof module&&"object"==typeof module.exports&&(module.exports=A);//,

//cookie
var k={};
k.set=function(e,t,n){var r="";if(n){var i=new Date;i.setTime(i.getTime()+24*n*60*60*1e3),r="; expires="+i.toGMTString()}document.cookie=e+"="+t+r+"; path=/"},
k.get=function(e){for(var t=e+"=",n=document.cookie.split(";"),r=0;r<n.length;r++){for(var i=n[r];" "==i.charAt(0);)i=i.substring(1,i.length);if(0==i.indexOf(t))return i.substring(t.length,i.length)}},
k.del=function(e){this.set(e,"",-1)};
//cookie

function o(e,t,n,r){var i=this;i.sampleRate=e,i.buffer=new Float32Array(isNaN(t)?1200:t),i.bufferSize=i.buffer.length,i.feedback=isNaN(n)?i.feedback:n,i.damping=isNaN(r)?i.damping:r,i.invDamping=1-i.damping};
o.prototype={sample:0,index:0,store:0,feedback:.84,damping:.2,pushSample:function(e){var t=this;return t.sample=t.buffer[t.index],t.store=t.sample*t.invDamping+t.store*t.damping,t.buffer[t.index++]=e+t.store*t.feedback,t.index>=t.bufferSize&&(t.index=0),t.sample},getMix:function(){return this.sample},reset:function(){this.index=this.store=0,this.samples=0,this.buffer=new Float32Array(this.bufferSize)},setParam:function(e,t){switch(e){case"damping":this.damping=t,this.invDamping=1-t;break;default:this[e]=t}}};

function a(e,t,n,r,i,s,u){var l=this;l.sampleRate=e,l.channelCount=isNaN(t)?l.channelCount:t,l.wet=isNaN(n)?l.wet:n,l.dry=isNaN(r)?l.dry:r,l.roomSize=isNaN(i)?l.roomSize:i,l.damping=isNaN(s)?l.damping:s,l.tuning=new a.Tuning(u||l.tuning),l.sample=function(){var e,t=[];for(e=0;e<l.channelCount;e++)t[e]=0;return t}(),l.CFs=function(){var e,t,n=[],r=[],i=l.tuning.combCount,a=l.damping*l.tuning.scaleDamping,s=l.roomSize*l.tuning.scaleRoom+l.tuning.offsetRoom,u=l.tuning.combTuning;for(t=0;t<l.channelCount;t++){for(e=0;i>e;e++)r.push(new o(l.sampleRate,u[e]+t*l.tuning.stereoSpread,s,a));n.push(r),r=[]}return n}(),l.numCFs=l.CFs[0].length,l.APFs=function(){var e,t,n=[],r=[],i=l.tuning.allPassCount,o=l.tuning.allPassFeedback,s=l.tuning.allPassTuning;for(t=0;t<l.channelCount;t++){for(e=0;i>e;e++)r.push(new a.AllPassFilter(l.sampleRate,s[e]+t*l.tuning.stereoSpread,o));n.push(r),r=[]}return n}(),l.numAPFs=l.APFs[0].length};
a.prototype={channelCount:2,sample:[0,0],wet:.5,dry:.55,damping:.2223,roomSize:.5,tuning:{},pushSample:function(e,t){var n,r=e*this.tuning.fixedGain,i=0;for(n=0;n<this.numCFs;n++)i+=this.CFs[t][n].pushSample(r);for(n=0;n<this.numAPFs;n++)i=this.APFs[t][n].pushSample(i);return this.sample[t]=i*this.wet+e*this.dry,this.sample[t]},getMix:function(e){return this.sample[e]},reset:function(){var e,t;for(t=0;t<this.channelCount;t++){for(e=0;e<this.numCFs;e++)this.CFs[t][e].reset();for(e=0;e<this.numAPFs;e++)this.APFs[t][e].reset();this.sample[t]=0}},setParam:function(e,t){var n,r,i,o;switch(e){case"roomSize":for(this.roomSize=t,n=this.roomSize*this.tuning.scaleRoom+this.tuning.offsetRoom,o=0;o<this.channelCount;o++)for(i=0;i<this.numCFs;i++)this.CFs[o][i].setParam("feedback",n);break;case"damping":for(this.damping=t,r=this.damping*this.tuning.scaleDamping,o=0;o<this.channelCount;o++)for(i=0;i<this.numCFs;i++)this.CFs[o][i].setParam("damping",r);break;default:this[e]=t}}},
a.Tuning=function(e){var t;if(e)for(t in e)e.hasOwnProperty(t)&&(this[t]=e[t])},
a.Tuning.prototype={combCount:8,combTuning:[1116,1188,1277,1356,1422,1491,1557,1617],allPassCount:4,allPassTuning:[556,441,341,225],allPassFeedback:.5,fixedGain:.015,scaleDamping:.9,scaleRoom:.28,offsetRoom:.7,stereoSpread:23},
a.AllPassFilter=function(e,t,n){var r=this;r.sampleRate=e,r.buffer=new Float32Array(isNaN(t)?500:t),r.bufferSize=r.buffer.length,r.feedback=isNaN(n)?r.feedback:n},
a.AllPassFilter.prototype={sample:0,index:0,feedback:.5,pushSample:function(e){var t=this;return bufOut=t.buffer[t.index],t.sample=-e+bufOut,t.buffer[t.index++]=e+bufOut*t.feedback,t.index>=t.bufferSize&&(t.index=0),t.sample},getMix:function(){return this.sample},reset:function(){this.index=0,this.sample=0,this.buffer=new Float32Array(this.bufferSize)}};
//"object"==typeof module&&"object"==typeof module.exports&&(module.exports=a),

function s(e,t,n,r,i){this.fromSampleRate=e,this.toSampleRate=t,this.channels=0|n,this.outputBufferSize=r,this.noReturn=!!i,this.initialize()};
s.prototype.initialize=function(){if(!(this.fromSampleRate>0&&this.toSampleRate>0&&this.channels>0))throw new Error("Invalid settings specified for the resampler.");this.fromSampleRate==this.toSampleRate?(this.resampler=this.bypassResampler,this.ratioWeight=1):(this.ratioWeight=this.fromSampleRate/this.toSampleRate,this.fromSampleRate<this.toSampleRate?(this.compileLinearInterpolationFunction(),this.lastWeight=1):(this.compileMultiTapFunction(),this.tailExists=!1,this.lastWeight=0),this.initializeBuffers())},
s.prototype.compileLinearInterpolationFunction=function(){for(var e="var bufferLength = buffer.length;  var outLength = this.outputBufferSize;  if ((bufferLength % "+this.channels+") == 0) {    if (bufferLength > 0) {      var weight = this.lastWeight;      var firstWeight = 0;      var secondWeight = 0;      var sourceOffset = 0;      var outputOffset = 0;      var outputBuffer = this.outputBuffer;      for (; weight < 1; weight += "+this.ratioWeight+") {        secondWeight = weight % 1;        firstWeight = 1 - secondWeight;",t=0;t<this.channels;++t)e+="outputBuffer[outputOffset++] = (this.lastOutput["+t+"] * firstWeight) + (buffer["+t+"] * secondWeight);";e+="}      weight -= 1;      for (bufferLength -= "+this.channels+", sourceOffset = Math.floor(weight) * "+this.channels+"; outputOffset < outLength && sourceOffset < bufferLength;) {        secondWeight = weight % 1;        firstWeight = 1 - secondWeight;";for(var t=0;t<this.channels;++t)e+="outputBuffer[outputOffset++] = (buffer[sourceOffset"+(t>0?" + "+t:"")+"] * firstWeight) + (buffer[sourceOffset + "+(this.channels+t)+"] * secondWeight);";e+="weight += "+this.ratioWeight+";        sourceOffset = Math.floor(weight) * "+this.channels+";      }";for(var t=0;t<this.channels;++t)e+="this.lastOutput["+t+"] = buffer[sourceOffset++];";e+='this.lastWeight = weight % 1;      return this.bufferSlice(outputOffset);    }    else {      return (this.noReturn) ? 0 : [];    }  }  else {    throw(new Error("Buffer was of incorrect sample length."));  }',this.resampler=Function("buffer",e)},
s.prototype.compileMultiTapFunction=function(){for(var e="var bufferLength = buffer.length;  var outLength = this.outputBufferSize;  if ((bufferLength % "+this.channels+") == 0) {    if (bufferLength > 0) {      var weight = 0;",t=0;t<this.channels;++t)e+="var output"+t+" = 0;";for(e+="var actualPosition = 0;      var amountToNext = 0;      var alreadyProcessedTail = !this.tailExists;      this.tailExists = false;      var outputBuffer = this.outputBuffer;      var outputOffset = 0;      var currentPosition = 0;      do {        if (alreadyProcessedTail) {          weight = "+this.ratioWeight+";",t=0;t<this.channels;++t)e+="output"+t+" = 0;";for(e+="}        else {          weight = this.lastWeight;",t=0;t<this.channels;++t)e+="output"+t+" = this.lastOutput["+t+"];";for(e+="alreadyProcessedTail = true;        }        while (weight > 0 && actualPosition < bufferLength) {          amountToNext = 1 + actualPosition - currentPosition;          if (weight >= amountToNext) {",t=0;t<this.channels;++t)e+="output"+t+" += buffer[actualPosition++] * amountToNext;";for(e+="currentPosition = actualPosition;            weight -= amountToNext;          }          else {",t=0;t<this.channels;++t)e+="output"+t+" += buffer[actualPosition"+(t>0?" + "+t:"")+"] * weight;";for(e+="currentPosition += weight;            weight = 0;            break;          }        }        if (weight <= 0) {",t=0;t<this.channels;++t)e+="outputBuffer[outputOffset++] = output"+t+" / "+this.ratioWeight+";";for(e+="}        else {          this.lastWeight = weight;",t=0;t<this.channels;++t)e+="this.lastOutput["+t+"] = output"+t+";";e+='this.tailExists = true;          break;        }      } while (actualPosition < bufferLength && outputOffset < outLength);      return this.bufferSlice(outputOffset);    }    else {      return (this.noReturn) ? 0 : [];    }  }  else {    throw(new Error("Buffer was of incorrect sample length."));  }',this.resampler=Function("buffer",e)},
s.prototype.bypassResampler=function(e){return this.noReturn?(this.outputBuffer=e,e.length):e},
s.prototype.bufferSlice=function(e){if(this.noReturn)return e;try{return this.outputBuffer.subarray(0,e)}catch(t){try{return this.outputBuffer.length=e,this.outputBuffer}catch(t){return this.outputBuffer.slice(0,e)}}},
s.prototype.initializeBuffers=function(){try{this.outputBuffer=new Float32Array(this.outputBufferSize),this.lastOutput=new Float32Array(this.channels)}catch(e){this.outputBuffer=[],this.lastOutput=[]}};//,

/////////////////////////////////
////////////////////////////////
!function(e){
  if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var t;"undefined"!=typeof window?t=window:"undefined"!=typeof global?t=global:"undefined"!=typeof self&&(t=self),t.page=e()}
}(
  function(){
    return (
      function e(t,n,r){
        function i(a,s){if(!n[a]){if(!t[a]){var u="function"==typeof require&&require;if(!s&&u)return u(a,!0);if(o)return o(a,!0);var l=new Error("Cannot find module '"+a+"'");throw l.code="MODULE_NOT_FOUND",l}var c=n[a]={exports:{}};t[a][0].call(c.exports,function(e){var n=t[a][1][e];return i(n?n:e)},c,c.exports,e,t,n,r)}return n[a].exports}for(var o="function"==typeof require&&require,a=0;a<r.length;a++)i(r[a]);return i
      }({
        1:[
          function(e,t,n){
            "use strict";
            function r(e,t){if("function"==typeof e)return r("*",e);if("function"==typeof t)for(var n=new s(e),i=1;i<arguments.length;++i)r.callbacks.push(n.middleware(arguments[i]));else"string"==typeof e?r["string"==typeof t?"redirect":"show"](e,t):r.start(e)}
            function i(e){if(!e.handled){var t;t=b?v+g.hash.replace("#!",""):g.pathname+g.search,t!==e.canonicalPath&&(r.stop(),e.handled=!1,g.href=e.canonicalPath)}}
            function o(e){return"string"!=typeof e?e:y?decodeURIComponent(e.replace(/\+/g," ")):e}
            function a(e,t){"/"===e[0]&&0!==e.indexOf(v)&&(e=v+(b?"#!":"")+e);var n=e.indexOf("?");if(this.canonicalPath=e,this.path=e.replace(v,"")||"/",b&&(this.path=this.path.replace("#!","")||"/"),this.title=document.title,this.state=t||{},this.state.path=e,this.querystring=~n?o(e.slice(n+1)):"",this.pathname=o(~n?e.slice(0,n):e),this.params={},this.hash="",!b){if(!~this.path.indexOf("#"))return;var r=this.path.split("#");this.path=r[0],this.hash=o(r[1])||"",this.querystring=this.querystring.split("#")[0]}}
            function s(e,t){t=t||{},this.path="*"===e?"(.*)":e,this.method="GET",this.regexp=h(this.path,this.keys=[],t.sensitive,t.strict)}
            function u(e){if(e.state){var t=e.state.path;r.replace(t,e.state)}else r.show(g.pathname+g.hash,void 0,void 0,!1)}
            function l(e){if(1===c(e)&&!(e.metaKey||e.ctrlKey||e.shiftKey||e.defaultPrevented)){for(var t=e.target;t&&"A"!==t.nodeName;)t=t.parentNode;if(t&&"A"===t.nodeName&&!t.getAttribute("download")&&"external"!==t.getAttribute("rel")){var n=t.getAttribute("href");if((b||t.pathname!==g.pathname||!t.hash&&"#"!==n)&&!(n&&n.indexOf("mailto:")>-1)&&!t.target&&f(t.href)){var i=t.pathname+t.search+(t.hash||""),o=i;i=i.replace(v,""),b&&(i=i.replace("#!","")),v&&o===i||(e.preventDefault(),r.show(o))}}}}
            function c(e){return e=e||window.event,null===e.which?e.button:e.which}
            function f(e){var t=g.protocol+"//"+g.hostname;return g.port&&(t+=":"+g.port),e&&0===e.indexOf(t)}
            var h=e("path-to-regexp");
            t.exports=r;
            var d,p,g="undefined"!=typeof window&&(window.history.location||window.location),m=!0,y=!0,v="",b=!1;
            r.callbacks=[],
            r.exits=[],
            r.current="",
            r.len=0,
            r.base=function(e){return 0===arguments.length?v:void(v=e)},
            r.start=function(e){if(e=e||{},!d&&(d=!0,!1===e.dispatch&&(m=!1),!1===e.decodeURLComponents&&(y=!1),!1!==e.popstate&&window.addEventListener("popstate",u,!1),!1!==e.click&&window.addEventListener("click",l,!1),!0===e.hashbang&&(b=!0),m)){var t=b&&~g.hash.indexOf("#!")?g.hash.substr(2)+g.search:g.pathname+g.search+g.hash;r.replace(t,null,!0,m)}},
            r.stop=function(){d&&(r.current="",r.len=0,d=!1,window.removeEventListener("click",l,!1),window.removeEventListener("popstate",u,!1))},
            r.show=function(e,t,n,i){var o=new a(e,t);return r.current=o.path,!1!==n&&r.dispatch(o),!1!==o.handled&&!1!==i&&o.pushState(),o},
            r.back=function(e,t){r.len>0?(history.back(),r.len--):e?setTimeout(function(){r.show(e,t)}):setTimeout(function(){r.show(v,t)})},
            r.redirect=function(e,t){"string"==typeof e&&"string"==typeof t&&r(e,function(e){setTimeout(function(){r.replace(t)},0)}),"string"==typeof e&&"undefined"==typeof t&&setTimeout(function(){r.replace(e)},0)},
            r.replace=function(e,t,n,i){var o=new a(e,t);return r.current=o.path,o.init=n,o.save(),!1!==i&&r.dispatch(o),o},
            r.dispatch=function(e){function t(){var e=r.exits[s++];return e?void e(o,t):n()}function n(){var t=r.callbacks[a++];return e.path!==r.current?void(e.handled=!1):t?void t(e,n):i(e)}var o=p,a=0,s=0;p=e,o?t():n()},
            r.exit=function(e,t){if("function"==typeof e)return r.exit("*",e);for(var n=new s(e),i=1;i<arguments.length;++i)r.exits.push(n.middleware(arguments[i]))},
            r.Context=a,
            a.prototype.pushState=function(){r.len++,history.pushState(this.state,this.title,b&&"/"!==this.path?"#!"+this.path:this.canonicalPath)},
            a.prototype.save=function(){history.replaceState(this.state,this.title,b&&"/"!==this.path?"#!"+this.path:this.canonicalPath)},
            r.Route=s,
            s.prototype.middleware=function(e){var t=this;return function(n,r){return t.match(n.path,n.params)?e(n,r):void r()}},
            s.prototype.match=function(e,t){var n=this.keys,r=e.indexOf("?"),i=~r?e.slice(0,r):e,a=this.regexp.exec(decodeURIComponent(i));if(!a)return!1;for(var s=1,u=a.length;u>s;++s){var l=n[s-1],c=o(a[s]);void 0===c&&hasOwnProperty.call(t,l.name)||(t[l.name]=c)}return!0},
            r.sameOrigin=f},{"path-to-regexp":2}
          ],
        2:[
          function(e,t,n){
            function r(e){return e.replace(/([=!:$\/()])/g,"\\$1")}
            function i(e,t){return e.keys=t,e}
            function o(e,t,n){a(t)||(n=t,t=null),t=t||[],n=n||{};var u=n.strict,l=n.end!==!1,c=n.sensitive?"":"i",f=0;if(e instanceof RegExp){var h=e.source.match(/\((?!\?)/g);if(h)for(var d=0;d<h.length;d++)t.push({name:d,delimiter:null,optional:!1,repeat:!1});return i(e,t)}if(a(e)){for(var p=[],d=0;d<e.length;d++)p.push(o(e[d],t,n).source);return i(new RegExp("(?:"+p.join("|")+")",c),t)}e=e.replace(s,function(e,n,i,o,a,s,u,l){if(n)return n;if(l)return"\\"+l;var c="+"===u||"*"===u,h="?"===u||"*"===u;return t.push({name:o||f++,delimiter:i||"/",optional:h,repeat:c}),i=i?"\\"+i:"",a=r(a||s||"[^"+(i||"\\/")+"]+?"),c&&(a=a+"(?:"+i+a+")*"),h?"(?:"+i+"("+a+"))?":i+"("+a+")"});var g="./"===e[e.length-1];return u||(e=(g?e.slice(0,-2):e)+"(?:\\/(?=$))?"),l||(e+=u&&g?"":"(?=\\/|$)"),i(new RegExp("^"+e+(l?"$":""),c),t)}
            var a=e("isarray");
            t.exports=o;
            var s=new RegExp(["(\\\\.)","([\\/.])?(?:\\:(\\w+)(?:\\(((?:\\\\.|[^)])*)\\))?|\\(((?:\\\\.|[^)])*)\\))([+*?])?","([.+*?=^!:${}()[\\]|\\/])"].join("|"),"g")
          },
          {isarray:3}
          ],
        3:[
          function(e,t,n){t.exports=Array.isArray||function(e){return"[object Array]"==Object.prototype.toString.call(e)}},
          {}
          ]
      },{},[1])(1)
    )
  }
);

var Oe=function(){
  var f,h,d,
      p=0,
      g={};

  function e(e){
    e?
      (f&&(f.style.display="block"),h&&(h.style.display="none"))
    :
      (f&&(f.style.display="none"),h&&(h.style.display="block"))
  }
  function dragover(e){
    e.stopPropagation(),
    e.preventDefault(),
    e.dataTransfer.dropEffect="copy"
  }
  function n(Filelist){
    console.log("Got "+Filelist.length+" files."),
    g["*"]&&g["*"](Filelist);
    var t=Object.keys(g);
    if(0!=t.length&&(1!=t.length||"*"!=t[0])){
      for(var SelectedFileList={},cnt=0;cnt<Filelist.length;cnt++){
        var file=Filelist[cnt],
            tipe=(file.type||file.name.replace(/.*\.(\w+)$/,"$1")).toLowerCase();
        SelectedFileList[tipe]||(SelectedFileList[tipe]=[]),
        SelectedFileList[tipe].push(file)
      }
      for(var tipe in SelectedFileList)
        if(g[tipe]){
          var FileSelect=SelectedFileList[tipe];
          g[tipe](FileSelect,tipe)
        }
        else 
          console.warn("Unknown file dropped:",tipe)
    }
  }
  function r(e){
    function t(e){
      a.push(e),
      --o||r()
    }
    function r(){
      n(a)
    }
    function i(e,n){
      if(n=n||"",e.isFile)
        o++,
        e.file(function(n){
          n.full_path=e.fullPath,
          t(n)
        });
      else if(e.isDirectory){
        var r=e.createReader();
        r.readEntries(function(t){
          for(var r=0;r<t.length;r++)
            i(t[r],n+e.name+"/")
        })
      }
    }
    for(var o=0,a=[],s=0;s<e.length;s++){
      var u=e[s].webkitGetAsEntry();
      u&&i(u)
    }
  }
  function drop(i){
    if(
      e(!1),
      dragover(i),
      i.dataTransfer.items&&
      i.dataTransfer.items[0]&&
      i.dataTransfer.items[0].webkitGetAsEntry
    )
      return r(i.dataTransfer.items);
    if(i.dataTransfer.files&&i.dataTransfer.files.length>0)
      return n(i.dataTransfer.files);
    if(i.dataTransfer.types&&"function"==typeof i.dataTransfer.types.filter){
      var o=Object.keys(g),
          a=i.dataTransfer.types.filter(function(e){
            return-1!=o.indexOf(e)||-1!=o.indexOf("*")
          }).map(function(e){
            return{
              type:e,
              data:i.dataTransfer.getData(e)
            }
          });
      n(a)
    }
  }
  function dragleave(n){
    dragover(n),
    0==--p&&e(!1)
  }
  function dragenter(n){
    dragover(n),
    p++,
    e(!0)
  }
  function load(e,n){
    if(d)
      throw new Error("Already loaded!");
    return (
      "undefined"==typeof FileReader?
        console.log("FileReader not supported")
      :
        (
          d=!0,
          f=e.show&&document.getElementById(e.show),
          h=e.hide&&document.getElementById(e.hide),
          document.addEventListener("dragenter",dragenter),
          document.addEventListener("dragleave",dragleave),
          document.addEventListener("dragover",dragover,!1),
          void document.addEventListener("drop",drop,!1)
        )
    )
  }
  function register(e,t){
    e.forEach(function(e){
      g[e.toLowerCase()]=t
    })
  }
  function unregister(e){
    delete g[type.toLowerCase()]
  }
  function unload(){
    return (
      "undefined"==typeof FileReader?
        console.log("FileReader not supported")
      :
        (
          g={},
          document.removeEventListener("dragenter",dragleave),
          document.removeEventListener("dragleave",dragleave),
          document.removeEventListener("dragover",dragover),
          void document.removeEventListener("drop",drop)
        )
    )
  }
  return {
    r:r,
    n:n,
    load:load,
    register:register,
    unregister:unregister,
    unload:unload
  }
}(window);


////////////////////////////////////////////////////////////////
/////////////////////////////////////////////
// visual
var Re=Re||{};
/////////////////////////////////////////
var Ue=function(){//Ue.guess() mimeDetect
  function e(e){
    return r[e]
  }
  function t(file){
    var r=file.split("."),
        i=r[r.length-1].toLowerCase();//get extension
    return (
      "mid"==i&&e(r[r.length-2])?
        e(r[r.length-2])
      :
        n[i]
    )
  }
  var n={
    mid:"audio/midi",
    midi:"audio/midi",
    rmi:"audio/midi",
    kar:"audio/x-midi",
    kar:"audio/midi",
    m32:"audio/midi-mt32",
    xmi:"audio/xmi",
    mus:"audio/mus",
    amf:"audio/amf",
    psm:"audio/psm",
    mod:"audio/mod",
    s3m:"audio/s3m",
    it:"audio/it",
    xm:"audio/xm",
    ay:"audio/ay",
    gbs:"audio/gbs",
    gym:"audio/gym",
    hes:"audio/hes",
    kss:"audio/kss",
    nsf:"audio/nsf",
    nsfe:"audio/nsfe",
    sap:"audio/sap",
    spc:"audio/spc",
    vgm:"audio/vgm",
    vgz:"audio/vgz",
    usf:"audio/usf",
    miniusf:"audio/usf",
    psf:"audio/psf",
    psf2:"audio/psf2",
    usflib:"audio/usflib",
    psflib:"audio/psflib",
    mdx:"audio/mdx",
    s98:"audio/s98",
    mym:"audio/mym",
    snd:"audio/sndh",
    sid:"audio/sid",
    hsc:"audio/hsc",
    sng:"audio/sng",
    imf:"audio/imf",
    wlf:"audio/wlf",
    adlib:"audio/adlib",
    a2m:"audio/a2m",
    sng:"audio/sng",
    amd:"audio/amd",
    bam:"audio/bam",
    cmf:"audio/cmf",
    mdi:"audio/mdi",
    d00:"audio/d00",
    dfm:"audio/dfm",
    hsp:"audio/hsp",
    ksm:"audio/ksm",
    mad:"audio/mad",
    dmo:"audio/dmo",
    sci:"audio/sci",
    laa:"audio/laa",
    mkj:"audio/mkj",
    cff:"audio/cff",
    dtm:"audio/dtm",
    sng:"audio/sng",
    mtk:"audio/mtk",
    rad:"audio/rad",
    raw:"audio/raw",
    sat:"audio/sat",
    sa2:"audio/sa2",
    //xad:"audio/xad",
    xad:"audio/xad",
    lds:"audio/lds",
    m:"audio/m",
    rol:"audio/rol",
    xsm:"audio/xsm",
    dro:"audio/dro",
    msc:"audio/msc",
    rix:"audio/rix",
    adl:"audio/adl",
    jbm:"audio/jbm"
  },
      r={mt32:"audio/midi-mt32"};
  return{
    guess:t
  }
}();
//"object"==typeof module&&"object"==typeof module.exports&&(module.exports=Ue);

var je={
  setting:["alien-planets","ancient-times","cold-war","colonialism","contemporary","cyberpunk","dystopian","fantasy","future","haunted-mansion","historical","horror","industrial","medieval","military","mythological","nature","not-applicable","old-days","post-apocalyptic","postmodern","prehistoric","renaissance","sci-fi","small-town","space","steampunk","survival","western"],
  rhythm:["atmospheric","bouncy","calm","energetic","no:ethereal","no:euphoric","no:explosive","gentle","no:jumpy","marching","mellow","no:progressive","no:quiet","restless","sleepy","no:soothing","swinging","trippy","no:vibrant","weary"],
  mood:["no:angry","anxious","no:bitter","blissful","brave","challenging","cheerful","no:cheerless","childish","confident","no:confused","cool","no:crazy","creepy","curious","dangerous","dark","defiant","no:demoralized","no:devotional","no:doubtful","dreamy","eerie","elegant","enigmatic","exciting","exploratory","no:fierce","fresh","friendly","no:ganged","no:ghostly","gloomy","no:graceful","happy","no:haunting","heroic","hopeful","hostile","no:humorous","hypnotic","inspiring","no:ironic","legendary","lively","lonely","magical","melancholic","menacing","no:messy","mournful","mysterious","no:negative","no:passionate","playful","positive","no:rebellious","no:romantic","sad","no:scary","sinister","solemn","spirited","suspenseful","no:sweet","theatrical","thoughtful","no:thrilling","no:thuggish","no:tragic","triumphant","no:united","urgent","no:visceral","no:vulgar"]
};

$.fn.serializeObject=function(){
  var e={},
      t=this.serializeArray();
  return (
    $.each(t,function(){
      void 0!==e[this.name]?
        (e[this.name].push||(e[this.name]=[e[this.name]]),e[this.name].push(this.value||""))
      :
        e[this.name]=this.value||""
    }),
    e
  )
};

var Ve={};
Ve.el="#song-form",
Ve.render=function(e){
  var t='<form id="song-form" style="display: none" onsubmit="return panel.send_data(this)">';
  t+='<button class="button right" type="submit">update</button>',
  t+="<h3>name</h3>",
  t+='<input type="text" class="song-filename" name="filename" disabled="true" />',
  t+='<input type="text" class="song-title" name="title" placeholder="title" />',
  t+='<input type="text" class="song-album" name="album" placeholder="album" />',
  t+='<input type="text" class="song-track" name="track" placeholder="track" />',
  t+='<fieldset id="song-attributes"></fieldset></form>',
  $("#main").append(t);
  var n="";
  for(var r in je){
    n+='<div class="song-cat"><h3>'+r+"</h3>";
    var i=je[r];
    n+=i.map(function(e){
      e=e.replace(/^no:/,"");
      var t=r+"-"+e;
      return (
        "<label>"+e+'<input type="checkbox" name="'+r+'[]" value="'+e+'" class="'+t+'"/></label>'
      )
    }).join("\n"),
    n+="</div>"
  }
  $("#song-attributes").html(n),
  this.rendered=!0
},
Ve.toggle=function(){$(this.el).toggle()},
Ve.show=function(){$(this.el).show()},
Ve.reset=function(){this.el.find("input").each(function(e){$(e).val(""),$(e).attr("selected",!1)})},
Ve.send_data=function(e){var t=$(e).serializeObject(),n=e.filename.value;return $.ajax({type:"PUT",url:"./songs/"+n+"/info",data:t,success:function(e){console.log(e)},error:function(e,t){console.log(e)}}),!1},
Ve.load=function(e){function t(e,t){$(e).attr("checked",!0).parent().addClass("selected")}this.rendered||this.render();var n=$(this.el);n.find("input[type=checkbox]").attr("checked",!1).parent().removeClass("selected"),n.find("input[type=text]").val("");for(var r in e){var i=e[r].toString().replace(/[^\w]/g,"-");if(null!==i&&"undefined"!=typeof i)if("string"==typeof i||"number"==typeof i){var o=n.find("."+r+"-"+i);o[0]?t(o):n.find("input.song-"+r).val(i)}else{if(!i.length)throw new Error("dont know how to map this shit");i.forEach(function(e){n.find("."+r+"-"+e).each(function(){t(this)})})}}};

var y=function(e,t){this.songs=e,this.index=0,this.sort(t||y.sorting)};
y.sorting="random",
y.prototype.sort=function(e){"random"==e?this.sort_by_random():this.sort_by_name(),this.names=this.songs.map(function(e){return e.name})},
y.prototype.sort_by_random=function(){this.songs=this.songs.sort(function(){return.5-Math.random()})},
y.prototype.sort_by_name=function(){this.songs=this.songs.sort(function(e,t){return e.name>t.name?1:-1})},
y.prototype.current=function(){if(!this.names)throw new Error("Playlist not sorted yet!");return this.names[this.index]},
y.prototype.feed=function(e){var t=this.songs[this.index];return t?void e(null,t):e()},
y.prototype.set=function(e){this.index=e},
y.prototype.prev=function(){return--this.index},
y.prototype.next=function(){return this.index<this.songs.length?++this.index:void 0},
y.prototype.set_song=function(e){var t=this.names.indexOf(e);return 0>t?console.log("Unable to find song in playlist: "+e):void this.set(t)};

var v=function(e){this.index=0,this.songs=[],this.query=[];var t=this,n={search:"filename",setting:"setting",mood:"mood",rhythm:"rhythm",list:"list",theme:"game_theme",genre:"game_genre",platform:"game_platform",year:"game_year"};Object.keys(n).forEach(function(r){e[r]&&t.query.push(n[r]+"="+e[r])})};
v.prototype=Object.create(y.prototype),
v.prototype.load=function(t){var n=this,r=Date.now();e("./playlist?"+this.query.join("&")+"&ts="+r,function(e,r,i){if(e||!i||"[]"==i)return t(e||new Error("No songs found."));var o=JSON.parse(i);n.songs=o.map(function(e){return{name:e}}),n.sort(y.sorting),t()})},
v.prototype.feed=function(t){var n=this.songs[this.index],r=n&&n.name;if(!n)return t();var i="./songs/"+r+"/data",o="./songs/"+r+"/info";e(i,{responseType:"arraybuffer"},function(n,a,s,u){if(n||/*200*/0!=a||!s)return t(n||new Error("Unable to get song at "+i));var l={file:r,name:r,data:s,type:u},c=l.name.split(/--|\./),f=c[0],h=-1!=l.name.indexOf("--")?c[1]:null;l.slug=f,e(o,{},function(n,r,i){if(n)return t(null,l);if(l.info=JSON.parse(i),l.info.title||(h?(l.info.album=et.titleize(f),l.name=h):"undefined"!=typeof l.info.track&&(l.name="Track "+(parseInt(l.info.track)+1))),!l.info.lib)return t(null,l);var o=l.info.lib,a=o.split("/").pop();e("./libs/"+o,{responseType:"arraybuffer"},function(e,n,r){/*200*/0==n&&r&&(l.lib={name:a,data:r}),t(null,l)})})})};

var b=function (e){
  this.index=0;
  var t=Ue.guess(e);//mimeDetect
  if(!t)
    throw new Error("Invalid file, type is not a song",e);
  this.songs=b.parse_url(e),
  this.names=this.songs.map(function(e){
    return e.name}
  )
};
b.parse_url=function(e){if(-1==e.indexOf("*"))return[{name:e}];for(var t=[],n=0;10>n;n++)t.push(e.replace("*",n));return t.map(function(e){return{name:e}})},
b.prototype=Object.create(y.prototype),
b.prototype.load=function(e){return this.songs?e():void 0},
b.prototype.feed=function(t){var n=this.songs[this.index],r=n&&n.name;return r?void e("./remote?song="+r,{responseType:"arraybuffer"},function(e,n,i,o){if(e||/*200*/0!==n||!i)return t(e||new Error("Unable to get song at "+r));var a=r.split("/").pop(),o=o||Ue.guess(r),s=Je.detect_song_type(a,o,i,!1);s.file=a,t(null,s)}):t()},
w.prototype=Object.create(y.prototype);


(function(e,t){
  "function"==typeof define&&define.amd?
    define(t)
  :
    "object"==typeof exports?
      module.exports=t()
    :
      e.NProgress=t()
}(
  this,
  function(){
    function e(e,t,n){return t>e?t:e>n?n:e}
    function t(e){return 100*(-1+e)}
    function n(e,n,r){var i;return i="translate3d"===l.positionUsing?{transform:"translate3d("+t(e)+"%,0,0)"}:"translate"===l.positionUsing?{transform:"translate("+t(e)+"%,0)"}:{"margin-left":t(e)+"%"},i.transition="all "+n+"ms "+r,i}
    function r(e,t){var n="string"==typeof e?e:a(e);return n.indexOf(" "+t+" ")>=0}
    function i(e,t){var n=a(e),i=n+t;r(n,t)||(e.className=i.substring(1))}
    function o(e,t){var n,i=a(e);r(e,t)&&(n=i.replace(" "+t+" "," "),e.className=n.substring(1,n.length-1))}
    function a(e){return(" "+(e.className||"")+" ").replace(/\s+/gi," ")}
    function s(e){e&&e.parentNode&&e.parentNode.removeChild(e)}
    var u={};
    u.version="0.2.0";
    var l=u.settings={minimum:.08,easing:"ease",positionUsing:"",speed:200,trickle:!1,trickleRate:.02,trickleSpeed:800,showSpinner:!1,barSelector:'[role="bar"]',spinnerSelector:'[role="spinner"]',parent:"body",template:'<div class="bar" role="bar"></div>'};
    u.configure=function(e){var t,n;for(t in e)n=e[t],void 0!==n&&e.hasOwnProperty(t)&&(l[t]=n);return this},
    u.status=null,
    u.set=function(t){var r=u.isStarted();t=e(t,l.minimum,1),u.status=1===t?null:t;var i=u.render(!r),o=i.querySelector(l.barSelector),a=l.speed,s=l.easing;return i.offsetWidth,c(function(e){""===l.positionUsing&&(l.positionUsing=u.getPositioningCSS()),f(o,n(t,a,s)),1===t?(f(i,{transition:"none",opacity:1}),i.offsetWidth,setTimeout(function(){f(i,{transition:"all "+a+"ms linear",opacity:0}),setTimeout(function(){u.remove(),e()},a)},a)):setTimeout(e,a)}),this},
    u.isStarted=function(){return"number"==typeof u.status},
    u.start=function(){u.status||u.set(0);var e=function(){setTimeout(function(){u.status&&(u.trickle(),e())},l.trickleSpeed)};return l.trickle&&e(),this},
    u.done=function(e){return e||u.status?u.inc(.3+.5*Math.random()).set(1):this},
    u.inc=function(t){var n=u.status;return n?("number"!=typeof t&&(t=(1-n)*e(Math.random()*n,.1,.95)),n=e(n+t,0,.994),u.set(n)):u.start()},
    u.trickle=function(){return u.inc(Math.random()*l.trickleRate)},
    function(){var e=0,t=0;u.promise=function(n){return n&&"resolved"!==n.state()?(0===t&&u.start(),e++,t++,n.always(function(){t--,0===t?(e=0,u.done()):u.set((e-t)/e)}),this):this}}(),
    u.render=function(e){if(u.isRendered())return document.getElementById("nprogress");i(document.documentElement,"nprogress-busy");var n=document.createElement("div");n.id="nprogress",n.innerHTML=l.template;var r,o=n.querySelector(l.barSelector),a=e?"-100":t(u.status||0),c=document.querySelector(l.parent);return f(o,{transition:"all 0 linear",transform:"translate3d("+a+"%,0,0)"}),l.showSpinner||(r=n.querySelector(l.spinnerSelector),r&&s(r)),c!=document.body&&i(c,"nprogress-custom-parent"),c.appendChild(n),n},
    u.remove=function(){o(document.documentElement,"nprogress-busy"),o(document.querySelector(l.parent),"nprogress-custom-parent");var e=document.getElementById("nprogress");e&&s(e)},
    u.isRendered=function(){return!!document.getElementById("nprogress")},
    u.getPositioningCSS=function(){var e=document.body.style,t="WebkitTransform"in e?"Webkit":"MozTransform"in e?"Moz":"msTransform"in e?"ms":"OTransform"in e?"O":"";return t+"Perspective"in e?"translate3d":t+"Transform"in e?"translate":"margin"};
    var c=function(){function e(){var n=t.shift();n&&n(e)}var t=[];return function(n){t.push(n),1==t.length&&e()}}(),
    f=function(){
      function e(e){return e.replace(/^-ms-/,"ms-").replace(/-([\da-z])/gi,function(e,t){return t.toUpperCase()})}
      function t(e){var t=document.body.style;if(e in t)return e;for(var n,r=i.length,o=e.charAt(0).toUpperCase()+e.slice(1);r--;)if(n=i[r]+o,n in t)return n;return e}
      function n(n){return n=e(n),o[n]||(o[n]=t(n))}
      function r(e,t,r){t=n(t),e.style[t]=r}
      var i=["Webkit","O","Moz","ms"],o={};
      return function(e,t){var n,i,o=arguments;if(2==o.length)for(n in t)i=t[n],void 0!==i&&t.hasOwnProperty(n)&&r(e,n,i);else r(e,o[1],o[2])}
    }();
  return u
  }
));
////////////////////
var He=He||{};//panel
He.is_playing=!1,
He.song_length=0,
He.looping=!1,
He.log=function(e){console.log("[Player] "+e)},

He.init=function(e){
  /////// /*****************/ //////////
  CtxAudio=ctxAudio();
  /////// /*****************/ //////////
  this.backends={}
},

He.addBackend=function(e){
  if(e.loaded)
    throw new Error("Backend is already loaded!");
  return (
    //e.types.forEach(function(t){He.backends[t]=e}),
    e.on("loading",function(){NProgress.remove(),He.trigger("loading")}),
    e.on("progress",Xe.setProgress),
    e.on("finished",He.next),
    e.on("crashed",He.crashed),
    e.on("playing",function(e,t){He.playing(!1,e,t)}),
    e.on("stopped",function(e,t){lyricsDisplayer.stop(),He.stopped(!1,e,t)}),
    e.on("resumed",function(e,t){He.playing(!0)}),
    e.on("paused",function(e,t){He.stopped(!0)}),
    e.on("load_start",function(){lyricsDisplayer.start(1),NProgress.set(0)}),
    e.on("load_progress",function(e){NProgress.set(e/100)}),
    e.on("load_end",function(){NProgress.done()}),
    e.loaded=!0,
    e
  )
},
He.setPlaylist=function(e){
  this.playlist&&this.stop(),
  this.playlist=e
},
He.getSong=function(){
  this.stop(),
  He.trigger("loading"),
  this.playlist.feed(function(e,t){
    return e?
      (He.log("Load error, skipping to next."),He.next())
    :
      t?
        "audio/mus"!=t.type?
          (
            He.playSong(t),
            void(t=null)
          )
        :
          (
            console.warn("MUS file detected. Converting to MIDI..."),
            void r(
              new Int8Array(t.data),
              "gm",
              function(e){
                t.data=e,
                t.type="audio/midi"||"audio/x-midi",
                He.playSong(t),
                t=null
              }
            )
          )
      :
        He.playlist_finished(e)
  })
},
He.playSong=function(e){
  if(!e||!e.data)throw new Error("No data passed!");
  if(He.current_song)return this.error(new Error("Already playing a song!"));
  if(!this.backends[e.type])return this.error(new Error("Empty or invalid format: "+e.type));
  var t,n=this.backends[e.type];
  this.current_backend&&n!=this.current_backend&&(this.log(" --- -> Shifting backends!"),this.stop()),
  He.log("Playing song: "+e.name),
  He.current_song=e,
  He.current_backend=n,
  Xe.setLength(0),
  n.on("length",function(e){He.song_length=e,Xe.setLength(e)}),
  e.type.match("midi")&&(t=new MidiBufferInput(e.data),
  tempo=t.tempo(),
  tempo&&He.trigger("tempo",tempo)),
  setTimeout(function(){n.play(e,t)},100)
},
He.error=function(e){He.trigger("error",e)},
He.crashed=function(e){He.trigger("crash",e||new Error("Application crashed."))},
He.playing=function(e,t,n){Xe.toggle(!0),Xe.setActive("play");var r=e?"resumed":"started";He.trigger(r,t,n)},
He.stopped=function(e){Xe.setActive("stop"),e||Xe.setProgress(0);var t=e?"paused":"stopped";He.trigger(t)},
He.playlist_finished=function(){He.looping?He.restart():(He.trigger("finished"),He.stopped())},
He.restart=function(){return He.playlist?(He.playlist.index=0,Xe.setPlaying(He.playlist.index),void He.play()):console.log("No playlist set. Cannot restart")},
He.play=function(){return He.playlist?void this.getSong():console.log("No playlist set. Cannot play.")},
He.stop=function(){this.current_backend&&(this.current_backend.stop(),this.current_song=null),lyricsDisplayer.stop()},
He.prev=function(){if(!He.playlist)return console.log("No playlist set. Cannot skip to prev.");if(He.current_backend&&He.current_backend.prev_track&&He.current_backend.prev_track())return He.log("Skipped to prev track in multitrack song.");if(!(He.playlist.index<=0)){var e=He.playlist.prev();Xe.setPlaying(e),He.getSong()}},
He.next=function(){if(!He.playlist)return console.log("No playlist set. Cannot skip to next.");if(He.current_backend&&He.current_backend.next_track&&He.current_backend.next_track())return He.log("Skipped to next track in multitrack song.");var e=He.playlist.next();e>=0&&(Xe.setPlaying(e),He.getSong()),lyricsDisplayer.next()},
He.pause=function(){this.current_backend&&this.current_backend.pause()},
He.resume=function(){this.current_backend&&this.current_backend.resume()},
He.skipTo=function(e){var t=He.playlist,n=parseInt(e);t&&t.index!=n&&(t.set(n),Xe.setPlaying(n),He.getSong())},
He.backendStatus=function(){return this.current_backend?this.current_backend.status():void 0},
He.playPause=function(){if(!this.current_backend)return this.log("No current backend."),this.play();var e=this.backendStatus();return"playing"==e?this.pause():"paused"==e?this.resume():"stopped"==e?this.play():void this.log("Cannot play/pause, backend is "+e)},
n(He);

//var Main=He;
var qe=function(){//volumeControl
  function e(e,t){var e="[Output] "+e;return arguments[0]=e,console.log.apply(console,arguments)}
  function t(){var e=Object.keys(p),t=e[e.length-1];return p[t]}
  function n(e,n){t().connect(n),p[e]=n}
  function r(e){f=e;var r=k.get("volume");if(h=r?parseFloat(r):y,d=p.gain=f.createGain(),p.gain.gain.value=h,m){var a=f.createAnalyser();a.smoothingTimeConstant=.2,a.fftSize=2048,n("analyser_before",a)}if(g){var s=f.createDynamicsCompressor();n("compressor",s)}if(m){var a=f.createAnalyser();a.smoothingTimeConstant=.2,a.fftSize=2048,n("analyser_after",a),setInterval(i,200)}return t().connect(f.destination),d.receive=o,d}
  function i(t){var n=new Uint8Array(p.analyser_before.frequencyBinCount);p.analyser_before.getByteFrequencyData(n);var r=new Uint8Array(p.analyser_after.frequencyBinCount);p.analyser_after.getByteFrequencyData(r);for(var i=0,o=0,a=n.length,s=0;a>s;s++)i+=n[s],o+=r[s];var u=i/a,l=o/a;e("Average volume before / after -> difference ",u,l,u-l),e("Reduction: ",p.compressor.reduction.value.toFixed(2))}
  function o(e){e.connect(d)}
  function a(){if(p.compressor)e("Disabling DynamicsCompressor."),p.compressor.disconnect(),delete p.compressor,t().connect(f.destination);else{e("Enabling DynamicsCompressor.");var n=t();n.disconnect(),p.compressor=f.createDynamicsCompressor(),n.connect(p.compressor),p.compressor.connect(f.destination)}}
  function s(e){return"undefined"==typeof e||e>1||0>e?console.log("Invalid volume!",e):(k.set("volume",e),void(p.gain.gain.value=e))}
  function u(){.01>=h||s(h-=.05)}
  function l(){h>=1.01||s(h+=.05)}
  function c(){return p.gain.gain.value}
  var f,h,d,p={},g=!0,m=!1,y=.8;
  return{
    setup:r,
    set_vol:s,
    decrease_vol:u,
    increase_vol:l,
    current_vol:c,
    toggle_compressor:a
  }
}();

var Ge={};
var $e=!1;
$.fn.removeClassPrefix=function(e){
  return (
    this.each(function(t,n){
      var r=n.className.split(" ").filter(function(t){
        return 0!==t.lastIndexOf(e,0)
      });
      n.className=$.trim(r.join(" "))
    }),
    this
  )
},

$(document).keydown(function(e){
  if(27==e.keyCode||!($e||e.ctrlKey||e.metaKey))
    switch(e.keyCode){
      case 9:e.preventDefault(),Ge.toggle_sidepane();break;//[tab]
      case 191:// S
      case 83:Ge.toggle_search();break;//s
      case 27:Ge.escape();break;//[esc]
      case 32:e.preventDefault(),He.playPause();break;//[space]
      case 37:He.prev();break;//<--
      case 39:He.next();break;//-->
      case 82:return ot?C():_();
      case 188:Ge.toggle_settings();break;
      case 73:Ve.toggle();break;
      case 86:Ge.next_visualizer();break;//v
      case 77:$("#settings-force-mt32").trigger("click")
    }
});

var Ge=function(){
  var e,t,n,
      r={},
      i=Object.keys(Re).concat(["none"]);
  return (
//    r.default_visualizer="Circles",
    r.default_visualizer="Lights",

    r.list_songs=function(e,t){
      var n=0,
          r=$("#songlist"),
          i=r.parent(),
          o=e.songs.map(function(e){
            var r=e.name,
                i=e.lib&&e.lib.name,
                o=n==t?
                  'class="selected"'
                :
                  "";
            return (
              i&&(r+=" <span>+ "+e.lib.name+"</span>"),
              "<li "+o+'><a href="#" data-index="'+n++ +'">'+r+"</a></li>"
            )
          }).join("");
      i.hasClass("nano")&&i.nanoScroller({destroy:!0}),
      r.html(o),
      Je.is_firefox()||Je.osx_lion_or_later()||r.addClass("nano-content").parent().addClass("nano").nanoScroller()
    },
    r.escape=function(){We.is_playing()?We.cancel():r.modal_open()?r.hide_modal():r.search_visible()?r.toggle_search():r.toggle_menu()},
    r.hide_all=function(){ze.hide(),r.hide_modal(),r.toggle_menu(!1),r.toggle_sidepane(!1)},
    r.toggle_settings=function(e){"#page-settings"==t?r.hide_modal():r.show_page({params:{page:"settings"}})},
    r.toggle_sidepane=function(e){if(e!==!1&&""==$("#songlist").html())return void $("#song-album").fadeOut().fadeTo(0,1500).fadeIn();var t="block"==$("#sidepane").toggle(e).css("display");$("#list-button").toggleClass("active",t)},
    r.search_visible=function(){return $("#search").is(":visible")},
    r.toggle_search=function(e){r.search_visible()||(r.hide_all(),setTimeout(function(){$("#search input").focus()},50)),$("#search").toggle(e)},
    r.load_searchbox=function(){$("#search form").on("submit",function(e){e.preventDefault();var t=this.name.value;t&&t.trim().length>2&&page.redirect("./search/"+t.replace(/ /g,"+"))})},
    r.render_logo=function(e,t){function n(e){$("#animation").fadeOut(e,function(){$(this).remove(),t&&t()})}function r(){return e?($("#corner-logo").fadeIn(),$("#logo #real").remove(),n(300)):void setTimeout(function(){$("#real img").animate({opacity:1},1e3),$("#real big").animate({opacity:1},2e3),n(1e3)},100)}e&&$("#logo").addClass("center");var i={file:"./img/muki-small-icon-lines.svg",type:"async",duration:150,pathTimingFunction:Vivus.EASE_OUT,animTimingFunction:Vivus.EASE};try{new Vivus("animation",i,r)}catch(o){r()}},
    r.hide_logo=function(){$("#corner-logo").fadeIn(),$("#logo #real").fadeOut(function(){$(this).remove()})},
    r.is_menu_visible=function(){return $(".cd-header").hasClass("nav-is-visible")},
    r.toggle_menu=function(e){if("undefined"==typeof e)e=!r.is_menu_visible();else if(e==r.is_menu_visible())return;e||r.hide_logo(),$(".cd-3d-nav-trigger").show(),$(".cd-header").toggleClass("nav-is-visible",e),$("#main").toggleClass("nav-is-visible",e),$(".cd-3d-nav-container").toggleClass("nav-is-visible",e),$(".cs-select").removeClass("cs-active")},
    r.update_selected_nav=function(e){var t=$(".cd-selected"),n=t.index()+1,i=t.offset();t.data("color");i&&$(".cd-marker").removeClassPrefix("color").addClass("color-"+n).animate({left:i.left},300),e&&setTimeout(r.toggle_menu,1200)},
    r.render_menu_options=function(){["mood"].forEach(function(e){var t=document.getElementById(e+"-menu-options");if(t){var n=je[e],r=n.map(function(t){return t.match(/^no:/)?"":'<li><a href="./'+e+"/"+t+'">'+t+"</a></li>"}).join("\n");t.innerHTML='<ul class="list">'+r+"</ul>"}})},
    r.mark_playing_mode=function(e,t,n){var i=$("#"+e+"-menu");i[0]&&(i.addClass("cd-selected").siblings().removeClass("cd-selected"),i.find(".playing").text(t.replace(":"," & ")),r.update_selected_nav(n))},
    r.open_modal=function(e,n){t&&r.hide_modal(),$("body").addClass("noscroll"),$(e).css("visibility","visible").removeClass("below").addClass("active").on("hide",function(){$(e).removeClass("active").addClass("below"),$("body").removeClass("noscroll")}).find(".close").on("click",function(t){t.preventDefault(),r.hide_modal(e),n&&n()}),t=e,"undefined"!=typeof woopra&&woopra.track("pv",{url:"./pages/"+e.replace("#",""),title:e+" modal"})},
    r.hide_modal=function(e){var e=e||t;$(e).removeClass("active").addClass("below"),$("body").removeClass("noscroll"),e==t&&(t=null)},
    r.modal_open=function(){return!!t},
    r.show_page=function(e){var t=e.params.page;t&&r.open_modal("#page-"+t)},
    r.handle_menu_events=function(){var e=Je.is_mobile()?"click":"mouseover";$(".cs-select")[e](function(){this.entered=!0,$(".cs-select").removeClass("cs-active"),$(this).addClass("cs-active")}),Je.is_mobile()||$(".cs-select").mouseout(function(){var e=this;e.entered=!1,setTimeout(function(){e.entered||$(e).removeClass("cs-active")},10)})},
    r.next_visualizer=function(){if(!e)return r.change_visualizer(i[0]);var t=i.indexOf(e.name);t+1==i.length&&(t=-1),r.change_visualizer(i[t+1])},
    r.change_visualizer=function(t,i){return $("#settings-visualization").val(t),e&&(e.unload(),e=null),"none"==t?void $("#viz").addClass("off"):(e=Re[t])&&("WebGL"!=e.type||window.WebGLRenderingContext)?(e.load("viz"),void(i||n||r.start_viz(tt.source,tt.context))):r.next_visualizer()},
    r.start_viz=function(t,n){$("#viz").removeClass("off");try{e.start(t,n)}catch(i){r.next_visualizer()}},
    r.load_settings=function(e,t){
      var n=k.get("disable_compressor")?!1:!0;
      $("#settings-midi-synth").val(t),
      $("#settings-compressor").attr("checked",n),
      $("#settings-force-mt32").on("change",function(){var e=this.checked;Je.mt32_mode=e,console.log("MT-32 mode (non-GM) set to: "+Je.mt32_mode),$("#settings-midi-synth").attr("disabled",e)}),
      $("#settings-midi-synth").on("change",function(){k.set("midi-synth",this.value,30),this.form.submit()}),
      $("#settings-visualization").on("change",function(){var e=this.value;e&&k.set("visualizer",e,30),Ge.change_visualizer(e)}),
      $("#settings-compressor").on("change",function(){var e=this.checked;e&&k.del("disable_compressor"),qe.toggle_compressor()})
    },
    r.init=function(t,i){
      var o=t||r.default_visualizer;
      r.change_visualizer(o,!0),
      r.load_settings(o,i),
      r.load_searchbox(),
      He.on("started",function(t,i){n=!1,e&&t&&i&&r.start_viz(t,i)}),
      He.on("tempo",function(t){e&&e.tempo&&e.tempo(t)}),
      He.on("stopped",function(){e&&e.stop()}),
      He.on("paused",function(){n=!0,e&&e.freeze()})
    },
    r
  )
}();

$(function(){
  $("#search input").on("focus",function(){$e=!0}).on("blur",function(){$e=!1}),
  Ge.render_menu_options(),
  Ge.handle_menu_events(),
  Je.is_firefox()||Je.osx_lion_or_later()||$(".cs-options .list").addClass("nano-content").parent().addClass("nano").nanoScroller(),
  $(".cd-3d-nav-trigger").on("click",function(e){e.preventDefault(),Ge.toggle_menu()}),
  $("body").on("click","#search, .overlay",function(e){var t=$(e.target);(t.hasClass("overlay")||"search"==t.attr("id"))&&Ge.escape()}),
  $("a.cs-placeholder").on("click",function(e){$(this).parent("li").addClass("cd-selected").siblings("li").removeClass("cd-selected"),Ge.update_selected_nav(!0)}),
  $(".playable.cs-options").on("click","a",function(){$("#nav .playing").html(""),$(".cs-select").removeClass("cs-active");var e=$(this).attr("href").split("/");Ge.mark_playing_mode(e[1],e[2],!0)}),
  $("#song-info").on("click",et.show_details),
  $("#voteform").on("click",".progress-button",function(){var e=$(this).hasClass("downvote")?"down":"up";ze[e](this)}),
  $("#list-button").on("click",function(){Ge.toggle_sidepane()}),
  $("#repeat-button").on("click",function(){$(this).toggleClass("active"),He.looping=!He.looping}),
  $("#settings-button").on("click",function(){Ge.toggle_settings()}),
  $(".player-button").on("click",function(){var e=$(this).attr("id").replace("-button","");He[e].call(He)})
});

var ze=function(){
  function e(e,t){var n=Date.now(),r=He.current_song.file,i="./vote?filename="+r+"&like="+e+"&ts="+n;$.get(i,function(e){}),"undefined"!=typeof woopra&&woopra.track("pv",{url:"./votes/"+r,title:(e?"Upvote":"Downvote")+" for "+r})}
  function t(){var e=Math.floor(Math.random()*c.length);return c[e]}
  function n(e){if(l||!He.current_song||!He.current_song.file)return!1;l=!0;var e=$(e),t=e.find(".submit"),n=e.find(".done");return t.addClass("loading"),setTimeout(function(){t.addClass("hide-loading").removeClass("loading"),n.addClass("finish")},1400),setTimeout(function(){r(function(){n.removeClass("finish"),t.removeClass("hide-loading")})},3800),!0}
  function r(e){s.fadeOut(e)}
  function i(){l=!1,u++>0&&a.text(t()),s.css({marginTop:"-40px",opacity:0,display:"block"}).find(".progress-button").show()}
  var o,a,s,u=0,l=!1,c=["You likey?","Hot or not?","Floats your boat?","Peels your banana?","Toasts your bagel?","Butters your toast?","Humps your camel?","Soothes your soul?","Tasty tune?","Loving it?","Enjoyable melody?","Golden oldie?","Pretty little ditty?","Savory piece?"];
  return{hide:function(){s&&!l&&r()},render:function(e,t){s||(s=$(e),a=s.find("#vote-question")),i(),s.animate({marginTop:"-=40px",opacity:1},320,"easeOutExpo"),t&&(clearTimeout(o),o=setTimeout(this.hide,t))},up:function(t){n(t)&&(e(!0),$(t).animate({left:"0"}).next().hide())},down:function(t){n(t)&&(e(!1),$(t).animate({left:"0"}).prev().hide())}}
}();

!function(e){"use strict";var t=function(t,n){this.el=e(t),this.options=e.extend({},e.fn.typed.defaults,n),this.isInput=this.el.is("input"),this.attr=this.options.attr,this.showCursor=this.isInput?!1:this.options.showCursor,this.elContent=this.attr?this.el.attr(this.attr):this.el.text(),this.contentType=this.options.contentType,this.typeSpeed=this.options.typeSpeed,this.startDelay=this.options.startDelay,this.backSpeed=this.options.backSpeed,this.backDelay=this.options.backDelay,this.strings=this.options.strings,this.strPos=0,this.arrayPos=0,this.stopNum=0,this.loop=this.options.loop,this.loopCount=this.options.loopCount,this.curLoop=0,this.stop=!1,this.cursorChar=this.options.cursorChar,this.shuffle=this.options.shuffle,this.sequence=[],this.build()};t.prototype={constructor:t,init:function(){var e=this;e.timeout=setTimeout(function(){for(var t=0;t<e.strings.length;++t)e.sequence[t]=t;e.shuffle&&(e.sequence=e.shuffleArray(e.sequence)),e.typewrite(e.strings[e.sequence[e.arrayPos]],e.strPos)},e.startDelay)},build:function(){this.showCursor===!0&&(this.cursor=e('<span class="typed-cursor">'+this.cursorChar+"</span>"),this.el.after(this.cursor)),this.init()},typewrite:function(e,t){if(this.stop!==!0){var n=Math.round(70*Math.random())+this.typeSpeed,r=this;r.timeout=setTimeout(function(){var n=0,i=e.substr(t);if("^"===i.charAt(0)){var o=1;/^\^\d+/.test(i)&&(i=/\d+/.exec(i)[0],o+=i.length,n=parseInt(i)),e=e.substring(0,t)+e.substring(t+o)}if("html"===r.contentType){var a=e.substr(t).charAt(0);if("<"===a||"&"===a){var s="",u="";for(u="<"===a?">":";";e.substr(t).charAt(0)!==u;)s+=e.substr(t).charAt(0),t++;t++,s+=u}}r.timeout=setTimeout(function(){if(t===e.length){if(r.options.onStringTyped(r.arrayPos),r.arrayPos===r.strings.length-1&&(r.options.callback(),r.curLoop++,r.loop===!1||r.curLoop===r.loopCount))return;r.timeout=setTimeout(function(){r.backspace(e,t)},r.backDelay)}else{0===t&&r.options.preStringTyped(r.arrayPos);var n=e.substr(0,t+1);r.attr?r.el.attr(r.attr,n):r.isInput?r.el.val(n):"html"===r.contentType?r.el.html(n):r.el.text(n),t++,r.typewrite(e,t)}},n)},n)}},backspace:function(e,t){if(this.stop!==!0){var n=Math.round(70*Math.random())+this.backSpeed,r=this;r.timeout=setTimeout(function(){if("html"===r.contentType&&">"===e.substr(t).charAt(0)){for(var n="";"<"!==e.substr(t).charAt(0);)n-=e.substr(t).charAt(0),t--;t--,n+="<"}var i=e.substr(0,t);r.attr?r.el.attr(r.attr,i):r.isInput?r.el.val(i):"html"===r.contentType?r.el.html(i):r.el.text(i),t>r.stopNum?(t--,r.backspace(e,t)):t<=r.stopNum&&(r.arrayPos++,r.arrayPos===r.strings.length?(r.arrayPos=0,r.shuffle&&(r.sequence=r.shuffleArray(r.sequence)),r.init()):r.typewrite(r.strings[r.sequence[r.arrayPos]],t))},n)}},shuffleArray:function(e){var t,n,r=e.length;if(r)for(;--r;)n=Math.floor(Math.random()*(r+1)),t=e[n],e[n]=e[r],e[r]=t;return e},reset:function(){var e=this;clearInterval(e.timeout);var t=this.el.attr("id");this.el.after('<span id="'+t+'"/>'),this.el.remove(),"undefined"!=typeof this.cursor&&this.cursor.remove(),e.options.resetCallback()}},e.fn.typed=function(n){return this.each(function(){var r=e(this),i=r.data("typed"),o="object"==typeof n&&n;i||r.data("typed",i=new t(this,o)),"string"==typeof n&&i[n]()})},e.fn.typed.defaults={strings:["These are the default values...","You know what you should do?","Use your own!","Have a great day!"],typeSpeed:0,startDelay:0,backSpeed:0,shuffle:!1,backDelay:500,loop:!1,loopCount:!1,showCursor:!0,cursorChar:"|",attr:null,contentType:"html",callback:function(){},preStringTyped:function(){},onStringTyped:function(){},resetCallback:function(){}}}(window.jQuery),

function(e){var t=5e3,n=function(e,t,n,r){this.x=e,this.y=t,this.size=n,this.color=r};n.prototype.mapXYToCanvasCoordinates=function(e,n){var r=Math.round(this.x/t*e),i=Math.round(this.y/t*n);return{x:r,y:i}};var r,i={getRandomStar:function(){var e=Math.floor(Math.random()*(t+1)),r=Math.floor(Math.random()*(t+1)),i=this._getWeightedRandomSize(),o=this._getWeightedRandomColor(),a=this._applyRandomShade(o);return new n(e,r,i,this._getRGBColorString(a))},_getWeightedRandomSize:function(){var e=[1,1.5,2],t=[.8,.15,.05];return this._getWeightedRandom(e,t)},_getWeightedRandomColor:function(){var e=[{r:255,g:189,b:111},{r:255,g:221,b:180},{r:255,g:244,b:232},{r:251,g:248,b:255},{r:202,g:216,b:255},{r:170,g:191,b:255},{r:155,g:176,b:255}],t=[.05,.05,.05,.7,.05,.05,.05];return this._getWeightedRandom(e,t)},_getRandomShade:function(){var e=[.4,.6,1],t=[.5,.3,.2];return this._getWeightedRandom(e,t)},_applyRandomShade:function(e){var t=this._getRandomShade();return 1!==t&&(e.r=Math.floor(e.r*t),e.g=Math.floor(e.g*t),e.b=Math.floor(e.b*t)),e},_getRGBColorString:function(e){return"rgb("+e.r+","+e.g+","+e.b+")"},_getWeightedRandom:function(e,t){for(var n=function(e,t){return Math.random()*(t-e)+e},r=t.reduce(function(e,t){return e+t}),i=n(0,r),o=0,a=0;a<e.length;a++)if(o+=t[a],o=+o.toFixed(2),o>=i)return e[a]}},o=[],a=!1;e.fn.starfield=function(n){var s=e.extend({starDensity:1,mouseScale:1,seedMovement:!0},n);$this=e(this);var u=$this.width(),l=$this.height(),c=u*l,f=.002*s.starDensity,h=Math.floor(c*f);if(s.seedMovement)var d=5,p=5;else var d=0,p=0;e('<canvas id="rocketwagon-canvas">').css({position:"absolute",left:0,top:0,width:"100%",height:"100%"}).attr({width:$this.width(),height:$this.height()}).prependTo($this);r=document.getElementById("rocketwagon-canvas");for(var g=0;h>g;g++)o.push(i.getRandomStar());var m=function(){e.each(o,function(e,n){var r=n.x-d,i=n.y-p;0>r&&(r+=t),0>i&&(i+=t),r>t&&(r-=t),i>t&&(i-=t),n.x=r,n.y=i})},y=function(){if(r.getContext){var t=r.getContext("2d");t.clearRect(0,0,u,l),t.fillStyle="black",t.fillRect(0,0,u,l),e.each(o,function(e,n){var r=n.mapXYToCanvasCoordinates(u,l);t.fillStyle=n.color,t.fillRect(r.x,r.y,n.size,n.size)})}};return function v(){a||(requestAnimationFrame(v),m(),y())}(),this.unload=function(){a=!0,e.each(o,function(e,t){t=null}),o=[],e(r).remove()},this}
}(jQuery);

var We=function(){function e(e,u){return a?u&&u():(a=!0,o=u,r=$(e),$(".skip-intro").on("click",t),i=r.starfield({starDensity:.1,mouseScale:.5,seedMovement:!0}),r.show(),void setTimeout(function(){r.find("p").typed({contentType:"text",strings:s,typeSpeed:20,backDelay:2e3,backSpeed:-15,callback:function(){setTimeout(function(){n(u)},3e3)}})},2e3))}
function t(e){e&&e.preventDefault(),a&&n(function(){o&&o()})}
function n(e){return a?(a=!1,void r.fadeOut(1e3,function(){i.unload(),r.remove(),e&&e()})):e&&e()}var r,i,o,a=!1,s=[];return location.search.match("ref=producthunt")?s.push("Hello there Product Hunters."):s.push("Hello there."),s.push("Remember the sound of the early 90's? ^800 Back then at the 1.44 MB floppy era?"),s.push("Everything was MIDI those days. ^500 You know, ^200 those tiny songs we heard in most computer games."),s.push("Then we got CD-ROMs, bigger hard drives and MP3s, ^200 and we kinda forgot about MIDI."),s.push("Or did we?"),s.push("This project is about bringing back MIDI and other rare formats of the day, ^300 and replay them using today's technology."),s.push("How do you think they'd sound if we played them back using only your browser?"),s.push("Now stay awhile, ^300 and listen."),{start:e,stop:n,cancel:t,is_playing:function(){return a}}
}();

var Xe={};
Xe.elements={},Xe.init=function(e){var t="songlist play_icon time_cursor time_elapsed time_remaining";t.split(" ").forEach(function(t){Xe.elements[t]=document.getElementById(e[t])}),this.elements.songlist&&$(this.elements.songlist).on("click","a",function(e){e.preventDefault(),He.skipTo($(this).data("index"))})},Xe.formatTime=function(e){var t=e/60>>0,n=String(e-60*t>>0);return 1==n.length&&(n="0"+n),t+":"+n},Xe.setLength=function(e){Xe.total_time=parseFloat(e)},Xe.resetProgress=function(){Xe.total_time=0,Xe.setProgress(0)},Xe.setProgress=function(e){if(0==e||"playing"==He.current_backend.status()){var t=Xe.elements;if(t.time_cursor){var n=e>>0,r=Xe.total_time>>0,i=0==Xe.total_time?0:e/Xe.total_time,o=$(t.time_cursor).parent().width(),a=i*o|0;t.time_cursor.style.width=a+"px",t.time_elapsed.innerHTML=Xe.formatTime(n),t.time_remaining.innerHTML="-"+Xe.formatTime(r-n)}}},Xe.setPlaying=function(e){var t=$("#songlist a[data-index="+e+"]");t[0]&&$(t).parent().addClass("selected").siblings().removeClass("selected")},Xe.setActive=function(e){"play"==e?$("#playPause-button").addClass("playing"):$("#playPause-button").removeClass("playing")},Xe.toggle=function(e){$(this.elements.controls).find("input").each(function(){$(this).attr("disabled",!e)})};


var Qe=function(){
  function e(e){
    for(var t="",n=e.length,r=0;n>r;r++)
      e[r]>0&&e[r]<128&&(t+=String.fromCharCode(e[r]));
    var i={},
        o=t.indexOf("_lib=");
    if(-1==o)
      return{};
    var a=t.substr(o);
    return (
      a.trim().split("\n").forEach(function(e){
        if(-1!=e.indexOf("=")){
          var t=e.split("=");
          i[t[0]]=t[1]
        }
      }),
      i
    )
  }
  return{
    read:e
  }
}();

var Ze=function(){
  function e(e){
    return String.fromCharCode.apply(String,e)
  }
  function t(t){
    for(var i=0,o=[],a=[],s=0;n>s&&(13!=t[s]||10!=t[s+1]||26!=t[s+2]);s++)
      o.push(t[s]),
      i++;
    i+=3;
    for(var s=0;r>s;s++){
      var u=t[i++];
      if(0==u)break;
      a.push(u)
    }
    return a.length>1?e(a).trim():null
  }
  var n=1024,
      r=1024;
  return{read:t}
}();
var Ke={
      search:null,
      list:null,
      platform:null,
      mood:null,
      rhythm:null,
      setting:null,
      year:null,
      genre:null
    };
var Je={};
Je.mt32_mode=!1,
Je.is_mobile=function(){
  return"undefined"!=typeof window.orientation
},
Je.is_firefox=function(){
  return!!navigator.userAgent.match("Firefox")
},
Je.osx_lion_or_later=function(){
  var e=window.navigator.userAgent,
      t=e.match(/Mac OS X ([\d._]+)/i),
      n=t&&t[1].replace(/_/g,".");
  return n&&parseFloat(n)>=10.7?!0:!1
},
Je.detect_song_type=function(name,type,n,r){
  var i={
        name:name,
        type:type
      };
  if("audio/midi"==type||"audio/x-midi"==type){
    var MidiIn=new MidiBufferInput(n);
  (
    Je.mt32_mode||MidiIn.is_mt32()
  )
  &&
  (
    console.log("MT-32 mode requested, or sysex detected."),
    i.type="audio/midi-mt32"
  )
  }
  else if("audio/mdx"==t){
    var a=Ze.read(new Int8Array(n));
    a&&(i.lib=a.toLowerCase().replace(/(.pdx)?$/i,".pdx"))
  }
  else if(t&&t.match(/\/(usf|psf)/)){
    var s=Qe.read(new Uint8Array(n));
    s._lib&&(console.log("PSF/USF lib required!",s._lib),i.lib=s._lib)
  }
  if("audio/vgm"==t&&!r){
    var u=new Uint8Array(n.slice(0,2));
    31==u[0]&&139==u[1]&&(console.log("Gzipped VGM detected."),r=!0)
  }
  if(r)
    try{
      i.data=new Zlib.Gunzip(new Uint8Array(n)).decompress()
    }
    catch(l){
      console.warn("Decompression failed, but trying anyway: "+l.message),
      i.data=n
    }
  else 
    i.data=n;
  return i
},
Je.load_dynamic_playlist=function(e,t,n){
  var e=e.params?e.params:e;
  Object.keys(Ke).forEach(function(e){Ke[e]=null}),
  e.search&&(e.search=e.search.replace(/ /g,"+")),
  Object.keys(e).forEach(function(t){
    Ke.hasOwnProperty(t.replace("game_",""))&&(Ke[t.replace("game_","")]=e[t]),
    "undefined"!=typeof Ge&&Ge.mark_playing_mode(t,e[t],!1)
  });
  var r=new v(e);
  r.load(function(i){
    n&&n(i),
    i||Je.hit_play(r,e.song,t)
  })
},
Je.load_search_playlist=function(e,t){
  Je.load_dynamic_playlist(e,t,function(e){if(!e)return Ge.toggle_search(!1);var t=$("#search label"),n=t.text();t.hasClass("error")||t.text(e.message).addClass("error").fadeTo(3e3,1).fadeOut(function(){$(this).text(n).removeClass("error").fadeIn()})})
},

Je.set_playlist=function(e){
  var t=e||DefaultPlaylist;
  He.setPlaylist(t),
  "undefined"!=typeof Ge&&Ge.list_songs&&Ge.list_songs(t,t.index)
},
Je.hit_play=function(e,t,n){
  t&&e.set_song&&e.set_song(t),
  Je.set_playlist(e),
  n!==!0&&He.play()
},
Je.resumeContext=function(e){
  function t(){
    e.resume(),
    setTimeout(function(){
      "running"===e.state&&document.body.removeEventListener("touchend",t,!1)
    },0)
  }
  document.body.addEventListener("touchend",t,!1)
},

Je.load_player=function(e){
  He.init();
  var t,
      ////////// /***********************/ ////////////
      //n=e||new AudioContext;
      n=e||CtxAudio;
      ////////// /***********************/ ////////////
  try{
    t=qe.setup(n)
  }
  catch(r){
    return!1
  }
  "suspended"===n.state&&Je.resumeContext(n);
  //var i="adlib";
  var i="soundfont";
  
  He.addBackend(P.init(n,t)),
  He.addBackend(I.init(n,t)),
  He.addBackend(D.init(n,t)),
  He.addBackend(L.init(n,t)),
  He.addBackend(F.init(n,t)),
  He.addBackend(B.init(n,t)),
  He.addBackend(U.init(n,t)),
  He.addBackend(j.init(n,t)),
  "undefined"!=typeof VGMJS?
    He.addBackend(VGMJS.init(n,t))
  :
    He.addBackend(R.init(n,t));
  var o={
        mt32:He.addBackend(N.init(n,t)),
        adlib:He.addBackend(V.init(n,t)),
        chiptune:He.addBackend(Ie.init(n,t)),
        soundfont:He.addBackend(M.init(n,t)),
        
      },
      a=location.search.match(/(m|midi)=(\w+)/),
      s=a&&a[2]||k.get("midi-synth");
  return (
    s&&o[s]&&(i=s),
    He.backends["audio/midi"||"audio/x-midi"]=o[i],
    Xe.init({
      songlist:"songlist",
      controls:".controls",
      play_icon:"play-icon",
      time_cursor:"cursor",
      time_elapsed:"time1",
      time_remaining:"time2"
    }),
    i
  )
},

Je.handle_player_events=function(){
  He.on("loading",function(e,t){et.setLoading(),$("#capsule").addClass("blink")}),
  He.on("started",function(e,t){tt.source=e,tt.context=t,et.show(He.current_song),$("#capsule").removeClass("blink")}),
  He.on("stopped",function(){et.clear()}),
  He.on("finished",function(){$("#capsule").removeClass("blink")}),
  He.on("error",function(e){$("#capsule").removeClass("blink"),console.log("Chipas cripas. Got error: "+e.message)}),
  He.on("crash",function(){console.log("HOLY SHENANIGANS! Reload, but keeping current index.");var e=He.playlist.index>0?"index="+(He.playlist.index-1):"";setTimeout(function(){window.location.search=e},2e3)})
},

Je.init_volume_control=function(){
  var e,
      t=0,
      n=$("#volume"),
      r=$("#song-info");
  $(".volume-container").on("mouseover",function(){
    t=1,
    0==n.width()&&(animating=!0,r.addClass("volume-on"),n.animate({width:"100px",opacity:1},300,function(){}))
  }).on("mouseout",function(){
    t=0,
    clearTimeout(e),
    e=setTimeout(function(){0==t&&n.animate({width:"0px",opacity:0},300,function(){r.removeClass("volume-on")})},500)
  }),
  n.on("change",function(){var e=this.value/100;qe.set_vol(e)});
  var i=100*qe.current_vol();
  n.val(i)
};

var et={
  disabled:!0
};
et.titleize=function(e){
  return e.replace(/-|_/g," ").replace(/(?:^|\s)\S/g,function(e){return e.toUpperCase()})
},
et.upper_roman_numerals=function(e){
  return e.replace(/ (v|x)?(i{1,3})(v|x)?(:|\s|$)/i,function(e){return((e[0]||"")+e[1]+(e[2]||"")+(e[3]||"")+(e[4]||"")).toUpperCase()})
},
et.setLoading=function(){
  et.disabled=!0,
  $("#song-album").text("[ Loading... ]")
},
et.clear=function(){
  et.disabled=!0,
  et.show_name({})
},
et.show=function(e){
  if(!e||!e.name)return et.clear();
  et.disabled=!1;
  var t=e.info||{};
  t.title||(t.title=et.titleize(e.name).replace(/(\.[a-z0-9]{2,4})?\....?$/,"")),
  t.album&&(t.album=et.upper_roman_numerals(t.album)),
  e.type&&(t.type=e.type.replace("audio/","").toUpperCase()),
  et.show_name(t),
  nt&&e.info&&"undefined"!=typeof Ve&&Ve.load(e.info)
},
et.show_name=function(e){
  $("#song-type").text(e.type||"").toggle(!!e.type),
  $("#song-title").text(e.title||""),
  /*******************************/
  /*******************************/
  $("#titles").text(e.title||""),
  /*******************************/
  /*******************************/
  $("#song-album").text(e.album||"")
},
et.get_share_url=function(e){
  var e=e||He.current_song,t=Object.keys(Ke).map(function(e){return Ke[e]?e+"/"+Ke[e]:null}).filter(function(e){return!!e}).join("/"),
      //n=location.origin+"/"+t.replace("https://muki.io//recent","/all").replace("/random","/all");
      n="https://muki.io"+"/"+t.replace("https://muki.io//recent","/all").replace("/random","/all");
  return n+"/song/"+e.file
},
et.show_details=function(e){
  function t(e){var t={Mirsoft:"mirsoft.info",QuestStudios:"www.queststudios.com",VGMRips:"vgmrips.net",VGMusic:"vgmusic.com",Zophar:"zophar.net",MidiShrine:"www.midishrine.com",Muki:"muki.io"};return e?t[e]?'<a target="_blank" href="http://'+t[e]+'">'+e+"</a>":e:"Unknown"}
  function n(){return'<a target="_blank" href="http://www.mobygames.com/game/'+r.slug+'">MobyGames</a>'}
  e.preventDefault();
  var r=He.current_song;
  if(r&&r.info&&r.info.album&&!et.disabled){
    var i=r.info,o="<h2>Song:</strong> "+i.title+"</h2>";if(o+="<ul>",o+="<li><strong>Game:</strong> "+i.album+"</li>",o+="<li><strong>Source:</strong> "+t(i.source)+"</li>",i.game_publisher&&(o+="<li><strong>Copyright:</strong> "+i.game_publisher+"</li>"),o+="<li><strong>File format:</strong> "+r.type.replace("audio/","").toUpperCase()+"</li>",rt||(o+="<li><strong>Game info:</strong> See on "+n()+"</li>"),o+="</ul>",r.file){var a=et.get_share_url(r);o+="<h2>Share this song!</h2>",o+="<p>Send the URL below to a friend and save the day.",o+='<input id="share-url" onclick="this.select()" value="'+a+'" />'}$("#page-song-details .content").html(o),Ge.open_modal("#page-song-details")
  }
};
var tt={},
    nt=!!window.location.host.match("localhost"),
    rt,it,ot,
    at=window.location.search.match(/index=(\d+)/);
var lyricsDisplayer;       
at&&(it=parseInt(at[1])),
window.AudioContext=window.AudioContext||window.webkitAudioContext;

$(function(){
//////////////////////////////////////////////////////////////
  document.getElementById('lyricButton').style.display="none";
/////////////////////////////////////////////////////////////  
  function e(){Ge.render_logo(!1,function(){Ge.toggle_menu(!0),setTimeout(function(){$("#player").toggle(!0)},300)})
    ////////// /***********************/ ////////////
    CtxAudio=ctxAudio();
    ////////// /***********************/ ////////////
  
  
  }
//////////////////////////////////////////////////////////////////////////////////  
  lyricsDisplayer=new MIDILyricsDisplayer(document.querySelector('div.lyrics'));
//////////////////////////////////////////////////////////////////////////////////  
  if(!window.AudioContext)return Alert();
  var t=Je.load_player();
  if(!t)
    return Alert();
  page("https://muki.io/search/:search/song/:song",Je.load_dynamic_playlist),
  page("https://muki.io/search/:search",Je.load_search_playlist),
  page("https://muki.io/mood/:mood/song/:song",Je.load_dynamic_playlist),
  page("https://muki.io/mood/:mood",Je.load_dynamic_playlist),
  page("https://muki.io/platform/:platform/song/:song",Je.load_dynamic_playlist),
  page("https://muki.io/platform/:platform",Je.load_dynamic_playlist),
  page("https://muki.io/list/:list/song/:song",Je.load_dynamic_playlist),
  page("https://muki.io/list/:list",Je.load_dynamic_playlist),
  page("https://muki.io/genre/:genre/song/:song",Je.load_dynamic_playlist),
  page("https://muki.io/genre/:genre",Je.load_dynamic_playlist),
  page("https://muki.io/setting/:setting/song/:song",Je.load_dynamic_playlist),
  page("https://muki.io/setting/:setting",Je.load_dynamic_playlist),
  page(/\/remote\/(.+)/,function(e){var t=new b(e.params[0]);Je.set_playlist(t),Main.play()}),
  page("https://muki.io/pages/:page",Ge.show_page),
  page("https://muki.io/search",Ge.toggle_search),
  page("https://muki.io/all",function(){page.redirect("https://muki.io/list/all")}),
  Je.handle_player_events(),
  Je.init_volume_control();
  var n=Je.is_mobile()?
        "none"
      :
        k.get("visualizer");
 
     
  S(),
  Ge.init(n,t),
  setTimeout(page,1e3),
  
  -1!=location.search.indexOf("chrome_app=1")&&
  (
    rt=!0,
    $("#more-menu .outbound-link").hide()
  );
  
  var r,
      i=$("#animation");
  
  if(
    He.on("started",function(){
      r&&clearTimeout(r);
      var e=He.current_song;
      e&&e.file&&
      (
        r=setTimeout(function(){
          i.is(":visible")||
          Ge.search_visible()||
          ze.render("#voteform",1e4)
        },1e4)
      )
    }),
    He.on("loading",function(){
      r&&clearTimeout(r),
      ze.hide()
    }),
    "./"!=location.pathname
  )
    return (
      $(".cd-3d-nav-trigger").toggle(!0),
      $("#player").toggle(!0),
      $("#song-album").text(""),
      Ge.render_logo(!0)
    );
  var o=!0;
  location.search.match("intro=1")||!o&&!location.search.match("intro=0")?
    (
      k.set("visited",1,60),
      We.start("#intro",e)
    )
  :
    e()
});


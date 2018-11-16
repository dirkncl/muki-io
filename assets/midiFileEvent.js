
/////////midiFile//////////
var Ye=function(){
  //midifile
  function e(e){
    for(var t=new ArrayBuffer(e.length),n=new Uint8Array(t),r=0,i=e.length;i>r;r++)
      n[r]=e[r];
    return t
  }
  function t(t,i){//MIDIFile(buffer, strictMode)
    if(t){
      if(t instanceof ArrayBuffer||(t=e(t)),t.byteLength<25)
        throw new Error("A buffer of a valid MIDI file must have, at least, a size of 25bytes.");
      this.header=new n(t,i),
      this.tracks=[];
      for(var o,a=14,s=0,u=this.header.getTracksCount();u>s;s++){
        if(i&&a>=t.byteLength-1)
          throw new Error("Couldn't find datas corresponding to the track #"+s+".");
        var o=new r(t,a,i);
        this.tracks.push(o),
        a+=o.getTrackLength()+8
      }
      if(i&&a!=t.byteLength)
        throw new Error("It seems that the buffer contains too much datas.")
    }
    else 
      this.header=new n,
      this.tracks=[new r]
  }
  //midifile
  
  //MIDIFileHeader
  function n(e,t){//MIDIFileHeader(buffer)
    if(e){
      if(!(e instanceof ArrayBuffer))
        throw Error("Invalid buffer received.");
      if(
        this.datas=new DataView(e,0,n.HEADER_LENGTH),
        "M"!==String.fromCharCode(this.datas.getUint8(0))||
        "T"!==String.fromCharCode(this.datas.getUint8(1))||
        "h"!==String.fromCharCode(this.datas.getUint8(2))||
        "d"!==String.fromCharCode(this.datas.getUint8(3))
      )
        throw new Error("Invalid MIDIFileHeader : MThd prefix not found");
      if(6!==this.datas.getUint32(4))
        throw new Error("Invalid MIDIFileHeader : Chunk length must be 6")
    }
    else{
      var r=new Uint8Array(n.HEADER_LENGTH);
      r[0]=77, r[1]=84, r[2]=104, r[3]=100,
      r[4]=0,  r[5]=0,  r[6]=0,   r[7]=6,
      r[8]=0,  r[9]=1,
      r[10]=0, r[11]=1,
      r[12]=0, r[13]=192,
      this.datas=new DataView(r.buffer,0,n.HEADER_LENGTH)
    }
  }
  //MIDIFileHeader
  
  //MIDIFileTrack
  function r(e,t,n){//MIDIFileTrack(buffer, start)
    if(e){
      if(!(e instanceof ArrayBuffer))
        throw Error("Invalid buffer received.");
      if(e.byteLength-t<12)
        throw Error("Invalid MIDIFileTrack (0x"+t.toString(16)+") : Buffer length must size at least 12bytes");
      if(
        this.datas=new DataView(e,t,r.HDR_LENGTH),
        "M"!==String.fromCharCode(this.datas.getUint8(0))||
        "T"!==String.fromCharCode(this.datas.getUint8(1))||
        "r"!==String.fromCharCode(this.datas.getUint8(2))||
        "k"!==String.fromCharCode(this.datas.getUint8(3))
      )
        throw Error("Invalid MIDIFileTrack (0x"+t.toString(16)+") : MTrk prefix not found");
      var i=this.getTrackLength();
      if(e.byteLength-t<i)
        throw Error("Invalid MIDIFileTrack (0x"+t.toString(16)+") : The track size exceed the buffer length.");
      if(
        this.datas=new DataView(e,t,r.HDR_LENGTH+i),
        255!==this.datas.getUint8(r.HDR_LENGTH+i-3)||
        47!==this.datas.getUint8(r.HDR_LENGTH+i-2)||
        0!==this.datas.getUint8(r.HDR_LENGTH+i-1)
      )
        throw Error("Invalid MIDIFileTrack (0x"+t.toString(16)+") : No track end event found at the expected index ("+(r.HDR_LENGTH+i-1).toString(16)+").")
    }
    else{
      var o=new Uint8Array(12);
      o[0]=77, o[1]=84, o[2]=114, o[3]=107,
      o[4]=0,  o[5]=0,  o[6]=0,   o[7]=4,
      o[8]=0,  o[9]=255,o[10]=47, o[11]=0,
      this.datas=new DataView(o.buffer,0,r.HDR_LENGTH+4)
    }
  }
  function i(e){
    return new t(e)
  }
  //MIDIFileTrack
  
  /////////midiEvents/////////
  var o={};
  o.EVENT_META=255,
  o.EVENT_SYSEX=240,
  o.EVENT_DIVSYSEX=247,
  o.EVENT_MIDI=8,
  o.EVENT_META_SEQUENCE_NUMBER=0,
  o.EVENT_META_TEXT=1,
  o.EVENT_META_COPYRIGHT_NOTICE=2,
  o.EVENT_META_TRACK_NAME=3,
  o.EVENT_META_INSTRUMENT_NAME=4,
  o.EVENT_META_LYRICS=5,
  o.EVENT_META_MARKER=6,
  o.EVENT_META_CUE_POINT=7,
  o.EVENT_META_MIDI_CHANNEL_PREFIX=32,
  o.EVENT_META_END_OF_TRACK=47,
  o.EVENT_META_SET_TEMPO=81,
  o.EVENT_META_SMTPE_OFFSET=84,
  o.EVENT_META_TIME_SIGNATURE=88,
  o.EVENT_META_KEY_SIGNATURE=89,
  o.EVENT_META_SEQUENCER_SPECIFIC=127,
  o.EVENT_MIDI_NOTE_OFF=8,
  o.EVENT_MIDI_NOTE_ON=9,
  o.EVENT_MIDI_NOTE_AFTERTOUCH=10,
  o.EVENT_MIDI_CONTROLLER=11,
  o.EVENT_MIDI_PROGRAM_CHANGE=12,
  o.EVENT_MIDI_CHANNEL_AFTERTOUCH=13,
  o.EVENT_MIDI_PITCH_BEND=14,
  o.MIDI_1PARAM_EVENTS=[
    o.EVENT_MIDI_PROGRAM_CHANGE,
    o.EVENT_MIDI_CHANNEL_AFTERTOUCH
  ],
  o.MIDI_2PARAMS_EVENTS=[
    o.EVENT_MIDI_NOTE_OFF,
    o.EVENT_MIDI_NOTE_ON,
    o.EVENT_MIDI_NOTE_AFTERTOUCH,
    o.EVENT_MIDI_CONTROLLER,
    o.EVENT_MIDI_PITCH_BEND
  ],
  o.createParser=function(e,t,n){
    if(
      e instanceof DataView&&
      (
        e={
          position:t||0,
          buffer:e,
          readUint8:function(){return this.buffer.getUint8(this.position++)},
          readUint16:function(){var e=this.buffer.getUint16(this.position);return this.position=this.position+2,e},
          readUint32:function(){var e=this.buffer.getUint16(this.position);return this.position=this.position+2,e},
          readVarInt:function(){for(var e=0,t=0;t++<4;){var n=this.readUint8();if(!(128&n))return e+n;e+=127&n,e<<=7}throw new Error("0x"+this.position.toString(16)+": Variable integer length cannot exceed 4 bytes")},
          readBytes:function(e){var t=[];for(e;e>0;e--)t.push(this.readUint8());return t},
          pos:function(){return"0x"+(this.buffer.byteOffset+this.position).toString(16)},
          end:function(e){return this.position===this.buffer.byteLength}
        },
        t=0
      ),
      t>0
    )
      for(;t--;)
        e.readUint8();
    var r,i,a,s,u;
    return{
      next:function(){
        if(e.end())
          return null;
        if(i={index:e.pos(),delta:e.readVarInt()},r=e.readUint8(),240==(240&r)){
          if(r!=o.EVENT_META){
            if(r==o.EVENT_SYSEX||r==o.EVENT_DIVSYSEX)
              return (
                i.type=r,
                i.length=e.readVarInt(),
                i.data=e.readBytes(i.length),
                i
              );
               
            if(n)
              throw new Error(e.pos()+" Unknown event type "+r.toString(16)+", Delta: "+i.delta+".");
            return (
              i.type=r,
              i.badsubtype=e.readVarInt(),
              i.length=e.readUint8(),
              i.data=e.readBytes(i.length),
              i
            )  
          }
          i.type=o.EVENT_META,
          i.subtype=e.readUint8(),
          i.length=e.readVarInt();
          switch(i.subtype){
            case o.EVENT_META_SEQUENCE_NUMBER:
              if(n&&2!==i.length)
                throw new Error(e.pos()+" Bad metaevent length.");
              return (
                i.msb=e.readUint8(),
                i.lsb=e.readUint8(),
                i
              );
            case o.EVENT_META_TEXT:
            case o.EVENT_META_COPYRIGHT_NOTICE:
            case o.EVENT_META_TRACK_NAME:
            case o.EVENT_META_INSTRUMENT_NAME:
            case o.EVENT_META_LYRICS:
            case o.EVENT_META_MARKER:
            case o.EVENT_META_CUE_POINT:
              return (
                i.data=e.readBytes(i.length),
                i
              );
            case o.EVENT_META_MIDI_CHANNEL_PREFIX:
              if(n&&1!==i.length)
                throw new Error(e.pos()+" Bad metaevent length.");
              return (
                i.prefix=e.readUint8(),
                i
              );
            case o.EVENT_META_END_OF_TRACK:
              if(n&&0!==i.length)
                throw new Error(e.pos()+" Bad metaevent length.");
              return i;
            case o.EVENT_META_SET_TEMPO:
              if(n&&3!==i.length)
                throw new Error(e.pos()+" Tempo meta event length must be 3.");
              return (
                i.tempo=(e.readUint8()<<16)+(e.readUint8()<<8)+e.readUint8(),
                i.tempoBPM=6e7/i.tempo,
                i
              );
            case o.EVENT_META_SMTPE_OFFSET:
              if(n&&5!==i.length)
                throw new Error(e.pos()+" Bad metaevent length.");
              if(i.hour=e.readUint8(),n&&i.hour>23)
                throw new Error(e.pos()+" SMTPE offset hour value must be part of 0-23.");
              if(i.minutes=e.readUint8(),n&&i.minutes>59)
                throw new Error(e.pos()+" SMTPE offset minutes value must be part of 0-59.");
              if(i.seconds=e.readUint8(),n&&i.seconds>59)
                throw new Error(e.pos()+" SMTPE offset seconds value must be part of 0-59.");
              if(i.frames=e.readUint8(),n&&i.frames>30)
                throw new Error(e.pos()+" SMTPE offset frames value must be part of 0-30.");
              if(i.subframes=e.readUint8(),n&&i.subframes>99)
                throw new Error(e.pos()+" SMTPE offset subframes value must be part of 0-99.");
              return i;
            case o.EVENT_META_KEY_SIGNATURE:
              if(n&&2!==i.length)
                throw new Error(e.pos()+" Bad metaevent length.");
              if(i.key=e.readUint8(),n&&(i.key<-7||i.key>7))
                throw new Error(e.pos()+" Bad metaevent length.");
              if(i.scale=e.readUint8(),n&&0!==i.scale&&1!==i.scale)
                throw new Error(e.pos()+" Key signature scale value must be 0 or 1.");
              return i;
            case o.EVENT_META_TIME_SIGNATURE:
              if(n&&4!==i.length)
                throw new Error(e.pos()+" Bad metaevent length.");
              return (
                i.data=e.readBytes(i.length),
                i
              );
            case o.EVENT_META_SEQUENCER_SPECIFIC:
              return (
                i.data=e.readBytes(i.length),
                i
              );
            default:
              if(n)
                throw new Error(e.pos()+" Unknown meta event type ("+i.subtype.toString(16)+").");
              return (
                i.data=e.readBytes(i.length),
                i
              )
          }
        }
        else{
          if(0==(128&r)){
            if(!a)
              throw new Error(e.pos()+" Running status without previous event");
            u=r
          }
          else 
            a=r>>4,
            s=15&r,
            u=e.readUint8();
          i.type=o.EVENT_MIDI,
          i.subtype=a,
          i.channel=s,
          i.param1=u;
          switch(a){
            case o.EVENT_MIDI_NOTE_OFF:
              return i.param2=e.readUint8(),i;
            case o.EVENT_MIDI_NOTE_ON:
              var t=e.readUint8();
              return (
                t?
                  i.param2=t
                :
                  (
                    i.subtype=o.EVENT_MIDI_NOTE_OFF,
                    i.param2=127
                  ),
                i
              );
            case o.EVENT_MIDI_NOTE_AFTERTOUCH:
              return i.param2=e.readUint8(),i;
            case o.EVENT_MIDI_CONTROLLER:
              return i.param2=e.readUint8(),i;
            case o.EVENT_MIDI_PROGRAM_CHANGE:
              return i;
            case o.EVENT_MIDI_CHANNEL_AFTERTOUCH:
              return i;
            case o.EVENT_MIDI_PITCH_BEND:
              return i.param2=e.readUint8(),i;
            default:
              if(n)
                throw new Error(e.pos()+" Unknown MIDI event type ("+a.toString(16)+").");
              return i
          }
        }
      }
    }
  },
  o.writeToTrack=function(e,t){
    for(var n=0,r=0,i=e.length;i>r;r++){
      if(e[r].delta>>>28)
        throw Error("Event #"+r+": Maximum delta time value reached ("+e[r].delta+"/134217728 max)");
      if(e[r].delta>>>21&&(t[n++]=e[r].delta>>>21&127|128),e[r].delta>>>14&&(t[n++]=e[r].delta>>>14&127|128),e[r].delta>>>7&&(t[n++]=e[r].delta>>>7&127|128),t[n++]=127&e[r].delta,e[r].type===o.EVENT_MIDI)
        t[n++]=(e[r].subtype<<4)+e[r].channel,
        t[n++]=e[r].param1,
        -1!==o.MIDI_2PARAMS_EVENTS.indexOf(e[r].subtype)&&(t[n++]=e[r].param2);
      else{
        if(t[n++]=e[r].type,e[r].type===o.EVENT_META&&(t[n++]=e[r].subtype),e[r].length>>>28)
          throw Error("Event #"+r+": Maximum length reached ("+e[r].length+"/134217728 max)");
      if(e[r].length>>>21&&(t[n++]=e[r].length>>>21&127|128),e[r].length>>>14&&(t[n++]=e[r].length>>>14&127|128),e[r].length>>>7&&(t[n++]=e[r].length>>>7&127|128),t[n++]=127&e[r].length,e[r].type===o.EVENT_META)
        switch(e[r].subtype){
          case o.EVENT_META_SEQUENCE_NUMBER:
            t[n++]=e[r].msb,
            t[n++]=e[r].lsb;
            break;
          case o.EVENT_META_TEXT:
          case o.EVENT_META_COPYRIGHT_NOTICE:
          case o.EVENT_META_TRACK_NAME:
          case o.EVENT_META_INSTRUMENT_NAME:
          case o.EVENT_META_LYRICS:
          case o.EVENT_META_MARKER:
          case o.EVENT_META_CUE_POINT:
            for(var a=0,s=e[r].length;s>a;a++)
              t[n++]=e[r].data[a];
            break;
          case o.EVENT_META_MIDI_CHANNEL_PREFIX:
            return t[n++]=e[r].prefix,event;
          case o.EVENT_META_END_OF_TRACK:
            break;
          case o.EVENT_META_SET_TEMPO:
            t[n++]=e[r].tempo>>16,
            t[n++]=e[r].tempo>>8&255,
            t[n++]=255&e[r].tempo;
            break;
          case o.EVENT_META_SMTPE_OFFSET:
            if(strictMode&&event.hour>23)
              throw new Error("Event #"+r+": SMTPE offset hour value must be part of 0-23.");
            if(t[n++]=e[r].hour,strictMode&&event.minutes>59)
              throw new Error("Event #"+r+": SMTPE offset minutes value must be part of 0-59.");
            if(t[n++]=e[r].minutes,strictMode&&event.seconds>59)
              throw new Error("Event #"+r+": SMTPE offset seconds value must be part of 0-59.");
            if(t[n++]=e[r].seconds,strictMode&&event.frames>30)
              throw new Error("Event #"+r+": SMTPE offset frames amount must be part of 0-30.");
            if(t[n++]=e[r].frames,strictMode&&event.subframes>99)
              throw new Error("Event #"+r+": SMTPE offset subframes amount must be part of 0-99.");
            return t[n++]=e[r].subframes,event;
          case o.EVENT_META_KEY_SIGNATURE:
            if("number"!=typeof e[r].key||e[r].key<-7||e[r].scale>7)
              throw new Error("Event #"+r+":The key signature key must be between -7 and 7");
            if("number"!=typeof e[r].scale||e[r].scale<0||e[r].scale>1)
              throw new Error("Event #"+r+":The key signature scale must be 0 or 1");
            t[n++]=e[r].key,
            t[n++]=e[r].scale;
            break;
          case o.EVENT_META_TIME_SIGNATURE:
          case o.EVENT_META_SEQUENCER_SPECIFIC:
          default:
            for(var a=0,s=e[r].length;s>a;a++)
              t[n++]=e[r].data[a]
        }
      else 
        for(var a=0,s=e[r].length;s>a;a++)
          t[n++]=e[r].data[a]
      }
    }
  },
  o.getRequiredBufferLength=function(e){
    var t=0,
        n=0;
    for(var r=e.length;r>n;n++)
      t+=e[n].delta>>>21?
        4
      :
        e[n].delta>>>14?
          3
        :
          e[n].delta>>>7?
            2
          :
            1,
      e[n].type===o.EVENT_MIDI?
        (
          t++,
          t++,
          -1!==o.MIDI_2PARAMS_EVENTS.indexOf(e[n].subtype)&&t++
        )
      :
        (
          t++,
          e[n].type===o.EVENT_META&&t++,
          t+=e[n].length>>>21?
            4
          :
            e[n].length>>>14?
              3
            :
              e[n].length>>>7?
                2
              :
                1,
          t+=e[n].length
        );
    return t
  };
  /////////midiEvents/////////
  
  /////////////utf8///////////
  var a={
        isUTF8:function(e){
          try{
            a.setBytesFromString(e)
          }
          catch(t){
            return!1
          }
          return!0
        },
        getCharLength:function(e){
          return (
            240==(240&e)?
              4
            :
              224==(224&e)?
                3
              :
                192==(192&e)?
                  2
                :
                  e==(127&e)?
                    1
                  :
                    0
          )
        },
        getCharCode:function(e,t,n){
          var r=0,
              i="";
          if(t=t||0,n=n||a.getCharLength(e[t]),0==n)
            throw new Error(e[t].toString(2)+" is not a significative byte (offset:"+t+").");
          if(1===n)
            return e[t];
          if(i="00000000",i[n]=1,e[t]&parseInt(i,2))
            throw Error("Index "+t+": A "+n+" bytes encoded char cannot encode the "+n+"th rank bit to 1.");
          for(i="0000".slice(0,n+1)+"11111111".slice(n+1),r+=(e[t]&parseInt(i,2))<<6*--n;n;){
            if(128!==e[t+1]&128||64===e[t+1]&64)
              throw Error("Index "+(t+1)+': Next bytes of encoded char must begin with a "10" bit sequence.');
            r+=(63&e[++t])<<6*--n
          }
          return r
        },
        getStringFromBytes:function(e,t,n,r){
          var i,
              o=[];
          n="number"==typeof n?
            n
          :
            e.byteLength||e.length;    
          for(t=0|t;n>t;t++){
            i=a.getCharLength(e[t]);
            if(t+i>n){
              if(r)
                throw Error("Index "+t+": Found a "+i+" bytes encoded char declaration but only "+(n-t)+" bytes are available.")
            }
            else 
              o.push(String.fromCharCode(a.getCharCode(e,t,i,r)));
            t+=i-1
          }
          return o.join("")
        },
        getBytesForCharCode:function(e){
          for(var t=0;4>t;t++)
            if(e<Math.pow(2,7+6*t))
              return t+1;
          throw new Error("CharCode "+e+" cannot be encoded with UTF8.")
        },
        setBytesFromCharCode:function(e,t,n,r){
          if(e=0|e,t=t||[],n=0|n,r=r||a.getBytesForCharCode(e),1==r)
            t[n]=e;
          else 
            for(t[n++]=(parseInt("1111".slice(0,r),2)<<8-r)+(e>>>6*--r);r>0;)
              t[n++]=e>>>6*--r&63|128;
          return t
        },
        setBytesFromString:function(e,t,n,r){
          e=e||"",
          t=t||[],
          n=0|n,
          r="number"==typeof r?
            r
          :
            t.byteLength||1/0;
          for(var i=0,o=e.length;o>i;i++){
            var s=a.getBytesForCharCode(e[i].charCodeAt(0));
            a.setBytesFromCharCode(e[i].charCodeAt(0),t,n,s),
            n+=s
          }
          return t
        }
      };
  /////////////utf8///////////
  return (
    //midiFile
    t.prototype.getEvents=function(e,t){
      var n,r,i=0,a=[],s=this.header.getFormat(),u=this.header.getTickResolution();if(1!==s||1===this.tracks.length)for(var l=0,c=this.tracks.length;c>l;l++)for(i=2==s&&i?i:0,n=new o.createParser(this.tracks[l].getTrackContent(),0,!1);r=n.next();)i+=r.delta?r.delta*u/1e3:0,r.type===o.EVENT_META&&r.subtype===o.EVENT_META_SET_TEMPO&&(u=this.header.getTickResolution(r.tempo)),e&&r.type!==e||t&&(!r.subtype||r.subtype!==e)||(r.playTime=i,a.push(r));else{var l,c,f=[],h=-1;for(l=0,c=this.tracks.length;c>l;l++)f[l]={},f[l].parser=new o.createParser(this.tracks[l].getTrackContent(),0,!1),f[l].curEvent=f[l].parser.next();do{for(h=-1,l=0,c=f.length;c>l;l++)f[l].curEvent&&(-1===h||f[l].curEvent.delta<f[h].curEvent.delta)&&(h=l);if(-1!==h){for(l=0,c=f.length;c>l;l++)l!==h&&f[l].curEvent&&(f[l].curEvent.delta-=f[h].curEvent.delta);r=f[h].curEvent,i+=r.delta?r.delta*u/1e3:0,r.type===o.EVENT_META&&r.subtype===o.EVENT_META_SET_TEMPO&&(u=this.header.getTickResolution(r.tempo)),e&&r.type!==e||t&&(!r.subtype||r.subtype!==e)||(r.playTime=i,r.track=h,a.push(r)),f[h].curEvent=f[h].parser.next()}}while(-1!==h)}return a
    },
    t.prototype.getMidiEvents=function(){
      return this.getEvents(o.EVENT_MIDI)
    },
    t.prototype.getLyrics=function(){
      var e,
          t=this.getEvents(o.EVENT_META),
          n=[],
          r=[];
      for(var i=(this.header.getFormat(),0),s=t.length;s>i;i++)
        e=t[i],
        e.subtype===o.EVENT_META_LYRICS?
          r.push(e)
        :
          e.subtype===o.EVENT_META_TEXT&&
          (
            "@"===String.fromCharCode(e.data[0])?
              "T"===String.fromCharCode(e.data[1])||
              "I"===String.fromCharCode(e.data[1])||
              "L"===String.fromCharCode(e.data[1])
            :
              0===e.data.map(function(e){
                return String.fromCharCode(e)
              }).join("").indexOf("words")?
                n.length=0
              :
                0!==e.playTime&&n.push(e)
          );
      r.length>2?
        n=r
      :
        n.length||(n=[]);
      try{
        n.forEach(function(e){
          e.text=a.getStringFromBytes(e.data,0,e.length,!0)
        })
      }
      catch(u){
        n.forEach(function(e){
          e.text=e.data.map(function(e){
            return String.fromCharCode(e)
          }).join("")
        })
      }
      return n
    },
    t.prototype.getTrackEvents=function(e){
      var t,n,
          r=[];
      if(e>this.tracks.length||0>e)
        throw Error("Invalid track index ("+e+")");
      n=new o.createParser(this.tracks[e].getTrackContent(),0,!1),
      t=n.next();
      do 
        r.push(t),
        t=n.next();
      while(t);
      return r
    },
    t.prototype.setTrackEvents=function(e,t){
      var n,r;
      if(e>this.tracks.length||0>e)
        throw Error("Invalid track index ("+e+")");
      if(!t||!t.length)
        throw Error("A track must contain at least one event, none given.");
      n=o.getRequiredBufferLength(t),
      r=new Uint8Array(n),
      o.writeToTrack(t,r),
      this.tracks[e].
      setTrackContent(r)
    },
    t.prototype.deleteTrack=function(e){
      if(e>this.tracks.length||0>e)
        throw Error("Invalid track index ("+e+")");
      this.tracks.splice(e,1),
      this.header.setTracksCount(this.tracks.length)
    },
    t.prototype.addTrack=function(e){
      if(e>this.tracks.length||0>e)
        throw Error("Invalid track index ("+e+")");
      var t=new r;
      e==this.tracks.length?
        this.tracks.push(t)
      :
        this.tracks.splice(e,0,t),
      this.header.setTracksCount(this.tracks.length)
    },
    t.prototype.getContent=function(){
      var e,t,r;
      e=n.HEADER_LENGTH;
      for(var i=0,o=this.tracks.length;o>i;i++)
        e+=this.tracks[i].getTrackLength()+8;
      t=new Uint8Array(e),
      r=new Uint8Array(this.header.datas.buffer,this.header.datas.byteOffset,n.HEADER_LENGTH);
      for(var i=0,o=n.HEADER_LENGTH;o>i;i++)
        t[i]=r[i];
      for(var a=0,s=this.tracks.length;s>a;a++){
        r=new Uint8Array(this.tracks[a].datas.buffer,this.tracks[a].datas.byteOffset,this.tracks[a].datas.byteLength);
      
      var l=this.tracks[a].datas.byteLength  
      for(var u=0;l>u;u++)
        t[i++]=r[u]
      }
      return t.buffer
    },
    //midiFile
    
    //midiFileHeader    
    n.HEADER_LENGTH=14,
    n.FRAMES_PER_SECONDS=1,
    n.TICKS_PER_BEAT=2,
    n.prototype.getFormat=function(){
      var e=this.datas.getUint16(8);
      if(0!==e&&1!==e&&2!==e)
        throw new Error("Invalid MIDI file : MIDI format ("+e+"), format can be 0, 1 or 2 only.");
      return e
    },
    n.prototype.setFormat=function(e){
      var e=this.datas.getUint16(8);
      if(0!==e&&1!==e&&2!==e)
        throw new Error("Invalid MIDI format given ("+e+"), format can be 0, 1 or 2 only.");
      return e
    },
    n.prototype.getTracksCount=function(){
      return this.datas.getUint16(10)
    },
    n.prototype.setTracksCount=function(e){
      return this.datas.setUint16(10,e)
    },
    n.prototype.getTickResolution=function(e){
      return (
        32768&this.datas.getUint16(12)?
          1e6/(this.getSMPTEFrames()*this.getTicksPerFrame())
        :
          (
            e=e||5e5,
            e/this.getTicksPerBeat()
          )
      )
    },
    n.prototype.getTimeDivision=function(){
      return (
        32768&this.datas.getUint16(12)?
          n.FRAMES_PER_SECONDS
        :
          n.TICKS_PER_BEAT
      )  
    },
    n.prototype.getTicksPerBeat=function(){
      var e=this.datas.getUint16(12);
      if(32768&e)
        throw new Error("Time division is not expressed as ticks per beat.");
      return e
    },
    n.prototype.setTicksPerBeat=function(e){
      this.datas.setUint16(12,32767&e)
    },
    n.prototype.getSMPTEFrames=function(){
      var e,
          t=this.datas.getUint16(12);
      if(!(32768&t))
        throw new Error("Time division is not expressed as frames per seconds.");
      if(e=32512&t,24!=e&&25!=e&&29!=e&&30!=e)
        throw new Error("Invalid SMPTE frames value ("+e+").");
      return (29===e?
          29.97
        :
          e
      )
    },
    n.prototype.getTicksPerFrame=function(){
      var e=this.datas.getUint16(12);
      if(!(32768&e))
        throw new Error("Time division is not expressed as frames per seconds.");
      return 255&e
    },
    n.prototype.setSMTPEDivision=function(e,t){
      if(24!=e&&25!=e&&29.97!=e&&29!=e&&30!=e)
        throw new Error("Invalid SMPTE frames value given ("+e+").");
      if(29.97==e&&(e=29),0>t||t>255)
        throw new Error("Invalid ticks per frame value given ("+e+").");
      this.datas.setUint8(12,128|e),
      this.datas.setUint8(13,t)
    },
    //midiFileHeader
    
    //midiFileTrack
    r.HDR_LENGTH=8,
    r.prototype.getTrackLength=function(){
      return this.datas.getUint32(4)
    },
    r.prototype.setTrackLength=function(e){
      return this.datas.setUint32(e)
    },
    r.prototype.getTrackContent=function(){
      return new DataView(this.datas.buffer,this.datas.byteOffset+r.HDR_LENGTH,this.datas.byteLength-r.HDR_LENGTH)
    },
    r.prototype.setTrackContent=function(e){
      var t=e.byteLength-e.byteOffset;
      if(4>t)
        throw Error("Invalid track length, must size at least 4bytes");
      this.datas=new DataView(new Uint8Array(r.HDR_LENGTH+t).buffer),
      this.datas.setUint8(0,77),
      this.datas.setUint8(1,84),
      this.datas.setUint8(2,114),
      this.datas.setUint8(3,107),
      this.datas.setUint32(4,t);
      var n=new Uint8Array(e.buffer,e.byteOffset,e.byteLength),i=new Uint8Array(this.datas.buffer,r.HDR_LENGTH,t),a=n.length;
      for(var o=0;a>o;o++)
        i[o]=n[o]
    },
    {
      load:i,
      Events:o
    }
    //midiFileTrack
  )
}();

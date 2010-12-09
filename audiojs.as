package {

import flash.display.Sprite;
import flash.external.ExternalInterface;
import flash.net.URLRequest;
import flash.media.Sound;
import flash.media.SoundChannel;
import flash.events.Event;
import flash.errors.IOError;
import flash.events.IOErrorEvent;
import flash.events.ProgressEvent;
import flash.events.TimerEvent;
import flash.utils.Timer;
import flash.system.Security;

public class audiojs extends Sprite {

  private var _channel:SoundChannel;
  private var sound:Sound;
  private var duration:Number;
  private var player_instance:String;

  private var pause_point:Number = 0;
  private var playing:Boolean = false;
  private var timer:Timer = new Timer(250, 0);


  private function get channel():SoundChannel {
    return this._channel;
  }

  private function set channel(channel:SoundChannel):void {
    this._channel = channel;
    this._channel.addEventListener(Event.SOUND_COMPLETE, this.sound_ended);
  }

  public function audiojs():void {
    Security.allowDomain("*");

    this.player_instance = root.loaderInfo.parameters.player_instance+'.';

    ExternalInterface.addCallback('init', init);
    ExternalInterface.addCallback('load', load);
    ExternalInterface.addCallback('play_pause', play_pause);
    ExternalInterface.addCallback('pplay', play);
    ExternalInterface.addCallback('ppause', pause);
    ExternalInterface.addCallback('skip_to', skip_to);

    ExternalInterface.call(this.player_instance+'load_started');
  }

  private function update_playhead(e:TimerEvent = null):void {
    var target_position:Number = e ? this.channel.position : this.pause_point;
    var play_progress:Number = target_position / this.duration;

    if (play_progress > 1) play_progress = 1;
    if (play_progress > 0) {
      ExternalInterface.call(this.player_instance+'update_playhead', play_progress);
    }
  }

  private function load_progress(e:ProgressEvent):void {
    this.duration = (e.bytesTotal / (e.bytesLoaded / this.sound.length))
    var load_percent:Number = e.bytesLoaded / e.bytesTotal;

    if (load_percent > 1) load_percent = 1;
    if (load_percent > 0) {
      ExternalInterface.call(this.player_instance+'load_progress', load_percent, (this.duration/1000));
    }
  }
  
  private function init(mp3_url:String):void {
    this.load(mp3_url);
  }

  private function load(mp3_url:String):void {
    if(this.channel) this.channel.stop();
    this.channel = new SoundChannel();
    this.sound = new Sound(new URLRequest(mp3_url));

    this.sound.addEventListener(IOErrorEvent.IO_ERROR, this.load_error);
    this.sound.addEventListener(ProgressEvent.PROGRESS, this.load_progress);

    this.timer.addEventListener(TimerEvent.TIMER, this.update_playhead);
    this.timer.start();
  }

  private function load_error(e:IOErrorEvent):void {
    ExternalInterface.call(this.player_instance+'load_error');
  }

  private function play():void {
    this.channel = this.sound.play(this.pause_point);
		this.playing = true;
		this.timer.start();
  }

  private function pause():void {
    this.pause_point = this.channel.position;
    this.channel.stop();
    this.playing = false;
    this.timer.stop();
  }

  private function play_pause():void {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  private function skip_to(percent:Number):void {
    this.channel.stop();
    this.pause_point = this.duration * percent;
    if (this.playing) {
      this.channel = this.sound.play(this.pause_point);
    } else {
      this.update_playhead();
    }
  }

  private function sound_ended(e:Event):void {
    ExternalInterface.call(this.player_instance+'track_ended');
  }

}

}
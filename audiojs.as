package {

import flash.display.Sprite;
import flash.external.ExternalInterface;
import flash.net.URLRequest;
import flash.media.Sound;
import flash.media.SoundChannel;
import flash.events.Event;
import flash.events.ProgressEvent;
import flash.events.TimerEvent;
import flash.utils.Timer;
import flash.system.Security;

public class audiojs extends Sprite {

  private var _channel:SoundChannel;
  private var sound:Sound;
  private var duration:Number;

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

    ExternalInterface.addCallback("load_mp3", load_mp3);
    ExternalInterface.addCallback("play_pause", play_pause);
    ExternalInterface.addCallback("skip_to", skip_to);

    var load_callback:String = root.loaderInfo.parameters.load_callback;
    ExternalInterface.call(load_callback);
  }

  private function update_playhead(e:TimerEvent = null):void {
    var target_position:Number = e ? this.channel.position : this.pause_point;
    var play_progress:Number = target_position / this.duration;
    if(play_progress > 0) {
      ExternalInterface.call('update_playhead', play_progress);
    }
  }

  private function load_progress(e:ProgressEvent):void {
    this.duration = (e.bytesTotal / (e.bytesLoaded / this.sound.length))

    var load_percent:Number = e.bytesLoaded / e.bytesTotal;
    if(load_percent > 0) {
      ExternalInterface.call('update_load_progress', load_percent);
    }
  }

  private function load_mp3(mp3_url:String):void {
    this.channel = new SoundChannel();
    this.sound = new Sound(new URLRequest(mp3_url));

    sound.addEventListener(ProgressEvent.PROGRESS, this.load_progress);

    this.timer.addEventListener(TimerEvent.TIMER, this.update_playhead);
    this.timer.start();
  }

  private function play_pause():void {
    if (this.playing) {
      this.pause_point = this.channel.position;
      this.channel.stop();
      this.playing = false;
      this.timer.stop();
    } else {
      this.channel = this.sound.play(this.pause_point);
  		this.playing = true;
  		this.timer.start();
    }
  }

  private function skip_to(percent:Number):void {
    this.channel.stop();
    this.pause_point = this.duration * percent;
    if(this.playing) {
      this.channel = this.sound.play(this.pause_point);
    } else {
      this.update_playhead();
    }
  }

  private function sound_ended(e:Event):void {
    this.timer.stop();
    ExternalInterface.call('update_playhead', 1);
    ExternalInterface.call('logg', 'sound ended.');
  }

}

}
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode as RntpRepeatMode,
} from 'react-native-track-player';

let isSetup = false;

export async function setupPlayer() {
  if (isSetup) return;

  let index = 0;
  try {
    await TrackPlayer.getActiveTrackIndex();
    isSetup = true;
    return;
  } catch {
    index = 0;
  }

  try {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
    });
  } catch {
    return;
  }

  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior:
        AppKilledPlaybackBehavior.ContinuePlayback,
    },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
      Capability.Stop,
    ],
    compactCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
    ],
    progressUpdateEventInterval: 1,
  });

  isSetup = true;
}

export async function playbackService() {
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });
}

export function mapRepeatMode(mode: string): RntpRepeatMode {
  switch (mode) {
    case 'off':
      return RntpRepeatMode.Off;
    case 'all':
      return RntpRepeatMode.Queue;
    case 'one':
      return RntpRepeatMode.Track;
    default:
      return RntpRepeatMode.Off;
  }
}

export function reverseRepeatMode(mode: RntpRepeatMode): string {
  switch (mode) {
    case RntpRepeatMode.Off:
      return 'off';
    case RntpRepeatMode.Queue:
      return 'all';
    case RntpRepeatMode.Track:
      return 'one';
    default:
      return 'off';
  }
}

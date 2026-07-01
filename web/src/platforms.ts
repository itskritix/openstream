// Prefilled RTMP ingest URLs for common platforms. Users paste only their stream key.
export interface PlatformTemplate {
  id: string;
  label: string;
  rtmpUrl: string;
}

export const PLATFORMS: PlatformTemplate[] = [
  { id: "twitch", label: "Twitch", rtmpUrl: "rtmp://live.twitch.tv/app" },
  { id: "youtube", label: "YouTube", rtmpUrl: "rtmp://a.rtmp.youtube.com/live2" },
  { id: "youtube-rtmps", label: "YouTube (RTMPS)", rtmpUrl: "rtmps://a.rtmps.youtube.com/live2" },
  { id: "kick", label: "Kick", rtmpUrl: "rtmps://fa723fc1b171.global-contribute.live-video.net/app" },
  { id: "facebook", label: "Facebook (RTMPS)", rtmpUrl: "rtmps://live-api-s.facebook.com:443/rtmp" },
  { id: "trovo", label: "Trovo", rtmpUrl: "rtmp://livepush.trovo.live/live" },
  { id: "custom", label: "Custom RTMP/RTMPS", rtmpUrl: "" },
];

// Prefilled RTMP ingest URLs for common platforms. Users paste only their stream key.
// URLs from each platform's official streaming docs; per-account ingest platforms
// (Rumble, VK, Bilibili…) use the Custom entry.
export interface PlatformTemplate {
  id: string;
  label: string;
  rtmpUrl: string;
}

export const PLATFORMS: PlatformTemplate[] = [
  { id: "twitch", label: "Twitch", rtmpUrl: "rtmp://live.twitch.tv/app" },
  { id: "youtube", label: "YouTube", rtmpUrl: "rtmp://a.rtmp.youtube.com/live2" },
  { id: "youtube-rtmps", label: "YouTube (RTMPS)", rtmpUrl: "rtmps://a.rtmps.youtube.com:443/live2" },
  { id: "kick", label: "Kick", rtmpUrl: "rtmps://fa723fc1b171.global-contribute.live-video.net/app" },
  { id: "facebook", label: "Facebook (RTMPS)", rtmpUrl: "rtmps://live-api-s.facebook.com:443/rtmp" },
  { id: "instagram", label: "Instagram (Live Producer)", rtmpUrl: "rtmps://live-upload.instagram.com:443/rtmp" },
  { id: "x", label: "X / Twitter (Media Studio)", rtmpUrl: "rtmp://va.pscp.tv:80/x" },
  { id: "trovo", label: "Trovo", rtmpUrl: "rtmp://livepush.trovo.live/live" },
  { id: "dlive", label: "DLive", rtmpUrl: "rtmp://stream.dlive.tv/live" },
  { id: "odysee", label: "Odysee", rtmpUrl: "rtmp://stream.odysee.com/live" },
  { id: "picarto", label: "Picarto", rtmpUrl: "rtmp://live.us.picarto.tv/golive" },
  { id: "vimeo", label: "Vimeo (RTMPS)", rtmpUrl: "rtmps://rtmp-global.cloud.vimeo.com/live" },
  { id: "nimo", label: "Nimo TV", rtmpUrl: "rtmp://txpush.rtmp.nimo.tv/live" },
  { id: "steam", label: "Steam Broadcast", rtmpUrl: "rtmp://ingest-any-ord1.broadcast.steamcontent.com/app" },
  { id: "cloudflare", label: "Cloudflare Stream (RTMPS)", rtmpUrl: "rtmps://live.cloudflare.com:443/live" },
  { id: "mixcloud", label: "Mixcloud", rtmpUrl: "rtmp://rtmp.mixcloud.com/broadcast" },
  { id: "custom", label: "Custom RTMP/RTMPS", rtmpUrl: "" },
];

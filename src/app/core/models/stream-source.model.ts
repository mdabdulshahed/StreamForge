/**
 * Streaming protocol carried by a manifest.
 *
 * `hls`  → HTTP Live Streaming, an `.m3u8` playlist.
 * `dash` → MPEG-DASH, an `.mpd` Media Presentation Description.
 */
export type StreamProtocol = 'hls' | 'dash';

/** Human-facing protocol label used in diagnostics and badges. */
export const PROTOCOL_LABEL: Readonly<Record<StreamProtocol, string>> = {
  hls: 'HLS',
  dash: 'MPEG-DASH',
};

/**
 * The minimum a player needs in order to load something.
 *
 * This is the contract the streaming layer consumes; everything the *catalog*
 * knows about a title (cast, genres, rails it belongs to) lives on `VideoAsset`
 * instead, so the player never has to care about merchandising metadata.
 */
export interface StreamSource {
  readonly id: string;
  readonly title: string;
  readonly type: StreamProtocol;
  readonly manifestUrl: string;
  readonly thumbnail: string;
  readonly description: string;
}

/**
 * Infers the protocol from a manifest URL.
 *
 * Shaka can sniff content types itself, but knowing the protocol up front lets
 * the UI label the stream before a single byte is fetched, and lets us reject
 * unsupported extensions early with a clear message.
 */
export function detectProtocol(manifestUrl: string): StreamProtocol | null {
  // Strip query/hash first: manifests are routinely signed with tokens.
  const path = manifestUrl.split(/[?#]/, 1)[0].toLowerCase();
  if (path.endsWith('.m3u8')) return 'hls';
  if (path.endsWith('.mpd')) return 'dash';
  return null;
}

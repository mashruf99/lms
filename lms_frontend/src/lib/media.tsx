export function getYoutubeEmbedUrl(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function isDirectVideoFile(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

export function VideoEmbed({ url }: { url: string }) {
  const youtubeEmbed = getYoutubeEmbedUrl(url);

  if (youtubeEmbed) {
    return (
      <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
        <iframe
          src={youtubeEmbed}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (isDirectVideoFile(url)) {
    return (
      <video controls className="w-full rounded-lg bg-black">
        <source src={url} />
        Your browser does not support the video tag.
      </video>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline text-blue-600">
      Watch video ↗
    </a>
  );
}

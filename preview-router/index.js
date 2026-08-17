export default {
  fetch(request) {
    const url = new URL(request.url);
    const match = url.hostname.match(/^preview-([a-z0-9-]+)\.inference-gateway\.com$/);
    if (!match) {
      return new Response('Not found', { status: 404 });
    }
    url.hostname = `${match[1]}.inference-gateway-docs.pages.dev`;
    return fetch(new Request(url, request));
  },
};

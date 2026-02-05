export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    
    // Try to serve the requested static asset from the ASSETS binding
    let response = await env.ASSETS.fetch(request);

    // SPA Fallback: If 404 and the path doesn't look like a file (no dot), serve index.html
    // This ensures that refreshing the page on a route like /insights works
    if (response.status === 404 && !url.pathname.includes('.')) {
      const indexRequest = new Request(new URL('/index.html', request.url), request);
      response = await env.ASSETS.fetch(indexRequest);
    }

    return response;
  }
};
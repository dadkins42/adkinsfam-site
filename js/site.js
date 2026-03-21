/* AdkinsFam Site - JavaScript */

// Cache buster to prevent stale data
function cacheBust(url) {
  const separator = url.includes('?') ? '&' : '?';
  return url + separator + '_t=' + Date.now();
}

// Determine base path - always use absolute path from root
function getBasePath() {
  return '';
}

// Format date nicely
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Load blog list on blogs.html
async function loadBlogList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const resp = await fetch(cacheBust('blogs/manifest.json'));
    const data = await resp.json();

    if (data.blogs.length === 0) {
      container.innerHTML = '<p style="color: var(--text-secondary);">No blogs yet.</p>';
      return;
    }

    container.innerHTML = data.blogs.map(blog => `
      <div class="blog-card">
        <h2><a href="blogs/${blog.slug}/index.html">${blog.emoji || ''} ${blog.title}</a></h2>
        <p class="blog-description">${blog.description || ''}</p>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<p style="color: var(--text-secondary);">Could not load blogs.</p>';
  }
}

// Load recent posts across all blogs for homepage
async function loadRecentPosts(containerId, limit) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const manifestResp = await fetch(cacheBust('blogs/manifest.json'));
    const manifest = await manifestResp.json();

    let allPosts = [];

    for (const blog of manifest.blogs) {
      try {
        const postsResp = await fetch(cacheBust(`blogs/${blog.slug}/posts.json`));
        const postsData = await postsResp.json();
        postsData.posts.forEach(post => {
          post._blogSlug = blog.slug;
          post._blogTitle = blog.title;
          post._blogEmoji = blog.emoji || '';
        });
        allPosts = allPosts.concat(postsData.posts);
      } catch (e) {
        // skip blog if posts can't be loaded
      }
    }

    // Sort by date descending
    allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    allPosts = allPosts.slice(0, limit || 5);

    if (allPosts.length === 0) {
      container.innerHTML = `
        <div class="blog-card">
          <h2>Welcome!</h2>
          <p class="blog-description">Posts will appear here once they're published from the DropPost app.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = allPosts.map(post => {
      const imageHtml = post.images && post.images.length > 0
        ? `<img class="post-image" src="blogs/${post._blogSlug}/${post.images[0]}" alt="${post.title}">`
        : '';

      const locationHtml = post.location
        ? ` &bull; <span class="location">📍 ${post.location}</span>`
        : '';

      return `
        <div class="post-card">
          ${imageHtml}
          <div class="post-body">
            <h2><a href="blogs/${post._blogSlug}/${post.slug}.html">${post.title}</a></h2>
            <div class="post-meta">
              ${post._blogEmoji} ${post._blogTitle} &bull; ${formatDate(post.date)}${locationHtml}
            </div>
            <p class="post-excerpt">${post.excerpt || ''}</p>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = '<p style="color: var(--text-secondary);">Could not load recent posts.</p>';
  }
}

// Load posts for a specific blog
async function loadBlogPosts(blogSlug, listId, titleId, descId, pageTitleId) {
  try {
    const basePath = getBasePath();
    const manifestResp = await fetch(cacheBust(`${basePath}/blogs/manifest.json`));
    const manifest = await manifestResp.json();
    const blog = manifest.blogs.find(b => b.slug === blogSlug);

    if (blog) {
      const titleEl = document.getElementById(titleId);
      const descEl = document.getElementById(descId);
      const pageTitleEl = document.getElementById(pageTitleId);
      if (titleEl) titleEl.textContent = `${blog.emoji || ''} ${blog.title}`;
      if (descEl) descEl.textContent = blog.description || '';
      if (pageTitleEl) pageTitleEl.textContent = `${blog.title} - Adkins Family`;
    }

    const postsResp = await fetch(cacheBust(`/blogs/${blogSlug}/posts.json`));
    const postsData = await postsResp.json();
    const container = document.getElementById(listId);

    if (postsData.posts.length === 0) {
      container.innerHTML = '<p style="color: var(--text-secondary);">No posts yet. Stay tuned!</p>';
      return;
    }

    // Sort by date descending
    const posts = postsData.posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = posts.map(post => {
      const imageHtml = post.images && post.images.length > 0
        ? `<img class="post-image" src="${post.images[0]}" alt="${post.title}">`
        : '';

      const locationHtml = post.location
        ? ` &bull; <span class="location">📍 ${post.location}</span>`
        : '';

      return `
        <div class="post-card">
          ${imageHtml}
          <div class="post-body">
            <h2><a href="${post.slug}.html">${post.title}</a></h2>
            <div class="post-meta">
              ${formatDate(post.date)}${locationHtml}
            </div>
            <p class="post-excerpt">${post.excerpt || ''}</p>
          </div>
        </div>
      `;
    }).join('');

    // Build archive sidebar
    buildArchiveSidebar(posts, blogSlug, 'post-archive');
  } catch (e) {
    document.getElementById(listId).innerHTML = '<p style="color: var(--text-secondary);">Could not load posts.</p>';
  }
}

// Build archive sidebar grouped by month
function buildArchiveSidebar(posts, blogSlug, containerId) {
  const container = document.getElementById(containerId);
  if (!container || posts.length === 0) return;

  // Group posts by month
  const grouped = {};
  posts.forEach(post => {
    const date = new Date(post.date + 'T12:00:00');
    const key = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(post);
  });

  let html = '';
  for (const [month, monthPosts] of Object.entries(grouped)) {
    html += `<details open>
      <summary>${month}</summary>
      <ul>`;
    monthPosts.forEach(post => {
      html += `<li><a href="${post.slug}.html">${post.title}</a></li>`;
    });
    html += `</ul></details>`;
  }

  container.innerHTML = `<h3>Posts</h3>${html}`;
}

// Load a single post
async function loadPost(blogSlug) {
  try {
    const postSlug = window.location.pathname.split('/').pop().replace('.html', '');
    const postsResp = await fetch(cacheBust('posts.json'));
    const postsData = await postsResp.json();
    const post = postsData.posts.find(p => p.slug === postSlug);

    if (!post) {
      document.getElementById('post-content').innerHTML = '<p>Post not found.</p>';
      return;
    }

    document.getElementById('post-title').textContent = post.title;
    document.getElementById('post-date').textContent = formatDate(post.date);
    document.getElementById('page-title').textContent = `${post.title} - Adkins Family`;

    const backLink = document.getElementById('back-link');
    backLink.href = 'index.html';

    if (post.location) {
      document.getElementById('post-location').innerHTML = ` &bull; <span class="location">📍 ${post.location}</span>`;
    }

    // Build content HTML
    let contentHtml = '';

    if (post.content) {
      // Convert line breaks to paragraphs
      const paragraphs = post.content.split('\n\n').filter(p => p.trim());
      contentHtml = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    }

    // Add images
    if (post.images && post.images.length > 0) {
      if (post.images.length === 1) {
        contentHtml += `<img src="${post.images[0]}" alt="${post.title}">`;
      } else {
        contentHtml += '<div class="image-row">';
        contentHtml += post.images.map(img => `<img src="${img}" alt="${post.title}">`).join('');
        contentHtml += '</div>';
      }
    }

    // Add video embeds
    if (post.videos && post.videos.length > 0) {
      post.videos.forEach(video => {
        if (video.includes('youtube.com') || video.includes('youtu.be')) {
          let videoId = '';
          if (video.includes('youtu.be/')) {
            videoId = video.split('youtu.be/')[1].split('?')[0];
          } else if (video.includes('v=')) {
            videoId = video.split('v=')[1].split('&')[0];
          }
          if (videoId) {
            contentHtml += `
              <div class="video-embed">
                <iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>
              </div>
            `;
          }
        }
      });
    }

    document.getElementById('post-content').innerHTML = contentHtml;
  } catch (e) {
    document.getElementById('post-content').innerHTML = '<p>Could not load post.</p>';
  }
}

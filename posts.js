document.addEventListener("DOMContentLoaded", () => {
  const postsDiv = document.getElementById("posts");

  // Hàm tạo thời gian tương đối
  function getRelativeTime(timestamp) {
    if (!timestamp) return "Vừa xong";
    
    const now = new Date();
    const date = timestamp.toDate();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return "Vừa xong";
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)} phút trước`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    } else if (diffInSeconds < 604800) {
      return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    } else {
      return date.toLocaleDateString("vi-VN");
    }
  }

  // Hàm copy link vào clipboard
  function copyToClipboard(text) {
    const dummy = document.createElement("textarea");
    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
    
    // Hiển thị thông báo
    showToast("Link bài viết đã được sao chép!");
  }
  
  // Hiển thị thông báo
  function showToast(message) {
    // Kiểm tra nếu đã có toast thì xóa
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Hiển thị toast
    setTimeout(() => {
      toast.classList.add('show');
      // Ẩn toast sau 3 giây
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          toast.remove();
        }, 300);
      }, 3000);
    }, 100);
  }

  // Xử lý like
  window.likePost = function(postId, button) {
    // Toggle active class cho nút
    button.classList.toggle('active');
    
    // Cập nhật số like trong Firestore
    const postRef = db.collection("posts").doc(postId);
    
    // Kiểm tra trạng thái like hiện tại
    if (button.classList.contains('active')) {
      postRef.update({ likes: firebase.firestore.FieldValue.increment(1) });
    } else {
      postRef.update({ likes: firebase.firestore.FieldValue.increment(-1) });
    }
  };

  // Xử lý share bài viết
  window.sharePost = function(postId) {
    // Giả sử link chia sẻ chuyển đến posts.html?postId=...
    const url = window.location.origin + window.location.pathname + "?postId=" + postId;
    if (navigator.share) {
      navigator.share({
        title: "Wish Connect - Post",
        text: "Check out this post on Wish Connect!",
        url: url
      }).then(() => {
        showToast("Chia sẻ thành công");
      }).catch(error => {
        console.error("Lỗi chia sẻ", error);
      });
    } else {
      copyToClipboard(url);
    }
  };

  // Xử lý bình luận
  window.addComment = function(e, postId) {
    e.preventDefault();
    const commentInput = document.getElementById(`comment-${postId}`);
    if (commentInput.value.trim()) {
      db.collection("posts").doc(postId).collection("comments").add({
        user: "Anonymous", // Có thể lấy thông tin từ auth
        content: commentInput.value,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      commentInput.value = "";
    }
  };

  // Load bài đăng từ Firestore
  function loadPosts() {
    db.collection("posts").orderBy("timestamp", "desc").onSnapshot(snapshot => {
      postsDiv.innerHTML = "";
      
      if (snapshot.empty) {
        postsDiv.innerHTML = `
          <div class="no-posts">
            <p>Chưa có bài đăng nào.</p>
            <a href="index.html" class="create-post-link">Tạo bài đăng đầu tiên</a>
          </div>
        `;
        return;
      }
      
      snapshot.forEach(doc => {
        const post = doc.data();
        const postElement = document.createElement("div");
        postElement.classList.add("post");
        
        // Số lượt like mặc định là 0 nếu không có
        const likeCount = post.likes || 0;
        
        postElement.innerHTML = `
          <div class="post-header">
            <img src="${post.avatar || 'default-avatar.png'}" alt="${post.user}" width="50" height="50">
            <div>
              <div class="post-author">${post.user}</div>
              <div class="post-time">${getRelativeTime(post.timestamp)}</div>
            </div>
          </div>
          
          <div class="post-content">${post.content}</div>
          
          <div class="post-actions">
            <button onclick="likePost('${doc.id}', this)" class="like-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span class="like-count">${likeCount}</span>
            </button>
            <button onclick="sharePost('${doc.id}')" class="share-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              Chia sẻ
            </button>
          </div>
          
          <div class="comments" id="comments-${doc.id}"></div>
          
          <form onsubmit="addComment(event, '${doc.id}')" class="comment-form">
            <input type="text" placeholder="Viết bình luận..." id="comment-${doc.id}">
            <button type="submit">Gửi</button>
          </form>
        `;
        
        postsDiv.appendChild(postElement);
        loadComments(doc.id);
      });
    });
  }

  // Load bình luận cho mỗi bài đăng
  function loadComments(postId) {
    db.collection("posts").doc(postId).collection("comments").orderBy("timestamp", "desc")
    .onSnapshot(snapshot => {
      const commentsDiv = document.getElementById(`comments-${postId}`);
      commentsDiv.innerHTML = "";
      
      if (snapshot.empty) {
        commentsDiv.innerHTML = "<p class='no-comments'>Chưa có bình luận nào.</p>";
        return;
      }
      
      snapshot.forEach(doc => {
        const comment = doc.data();
        const commentElement = document.createElement("div");
        commentElement.classList.add("comment");
        commentElement.innerHTML = `
          <span class="comment-author">${comment.user}</span>
          <span class="comment-time">${getRelativeTime(comment.timestamp)}</span>
          <div class="comment-content">${comment.content}</div>
        `;
        commentsDiv.appendChild(commentElement);
      });
    });
  }

  loadPosts();
});
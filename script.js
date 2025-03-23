document.addEventListener("DOMContentLoaded", () => {
  // Firebase Authentication
  const auth = firebase.auth();
  const db = firebase.firestore();
  const storage = firebase.storage();
  
  // DOM Elements
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginDiv = document.getElementById("login");
  const appDiv = document.getElementById("app");
  const avatarForm = document.getElementById("avatar-form");
  const avatarUpload = document.getElementById("avatar-upload");
  const userAvatar = document.getElementById("user-avatar");
  const postForm = document.getElementById("post-form");
  const postContent = document.getElementById("post-content");
  
  // Thêm animation cho avatar
  function pulseAvatar() {
    userAvatar.classList.add("pulse");
    setTimeout(() => {
      userAvatar.classList.remove("pulse");
    }, 1000);
  }

  // Đăng nhập với Google
  loginBtn.onclick = () => {
    loginBtn.disabled = true;
    loginBtn.textContent = "Đang đăng nhập...";
    
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => {
      console.error("Lỗi đăng nhập:", error);
      loginBtn.disabled = false;
      loginBtn.textContent = "Đăng nhập với Google";
      
      // Hiển thị thông báo lỗi
      alert(`Lỗi đăng nhập: ${error.message}`);
    });
  };

  // Đăng xuất
  logoutBtn.onclick = () => {
    const confirmation = confirm("Bạn có chắc chắn muốn đăng xuất?");
    if (confirmation) {
      auth.signOut().catch(error => {
        console.error("Lỗi đăng xuất:", error);
      });
    }
  };

  // Theo dõi trạng thái đăng nhập
  auth.onAuthStateChanged(user => {
    if (user) {
      // Người dùng đã đăng nhập
      loginDiv.style.display = "none";
      appDiv.style.display = "block";
      
      // Hiển thị thông tin người dùng
      console.log("Đã đăng nhập:", user.displayName);
      
      // Kiểm tra xem người dùng đã có trong database chưa
      db.collection("users").doc(user.uid).get().then(doc => {
        if (!doc.exists) {
          // Tạo tài khoản mới trong database
          db.collection("users").doc(user.uid).set({
            name: user.displayName,
            email: user.email,
            avatar: user.photoURL || "default-avatar.png",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      });
      
      // Tải avatar từ Storage
      const avatarRef = storage.ref(`avatars/${user.uid}`);
      avatarRef.getDownloadURL().then(url => {
        userAvatar.src = url;
      }).catch(() => {
        // Nếu không có avatar trong storage, lấy từ Google hoặc dùng mặc định
        userAvatar.src = user.photoURL || "default-avatar.png";
      });
    } else {
      // Người dùng chưa đăng nhập
      loginDiv.style.display = "block";
      appDiv.style.display = "none";
      loginBtn.disabled = false;
      loginBtn.textContent = "Đăng nhập với Google";
    }
  });

  // Cập nhật avatar
  avatarForm.onsubmit = e => {
    e.preventDefault();
    const file = avatarUpload.files[0];
    
    if (!file) {
      alert("Vui lòng chọn một file ảnh");
      return;
    }
    
    // Kiểm tra kích thước file (giới hạn 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Kích thước file quá lớn. Vui lòng chọn file nhỏ hơn 2MB");
      return;
    }
    
    // Kiểm tra loại file
    if (!file.type.match('image.*')) {
      alert("Vui lòng chọn file ảnh");
      return;
    }
    
    // Hiển thị loading state
    const submitBtn = avatarForm.querySelector("button[type='submit']");
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang tải lên...";
    
    // Tạo reference đến storage
    const avatarRef = storage.ref(`avatars/${auth.currentUser.uid}`);
    
    // Upload file
    avatarRef.put(file).then(() => {
      return avatarRef.getDownloadURL();
    }).then(url => {
      // Cập nhật avatar trong UI
      userAvatar.src = url;
      
      // Lưu avatar cho người dùng
      return db.collection("users").doc(auth.currentUser.uid).set({ 
        avatar: url 
      }, { merge: true });
    }).then(() => {
      // Hoàn thành
      pulseAvatar();
      submitBtn.textContent = "✓ Đã cập nhật";
      
      // Reset form sau 2 giây
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        avatarUpload.value = "";
      }, 2000);
    }).catch(error => {
      console.error("Lỗi upload avatar:", error);
      alert(`Lỗi khi tải ảnh lên: ${error.message}`);
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    });
  };

  // Khi chọn file, hiển thị preview
  avatarUpload.onchange = () => {
    const file = avatarUpload.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        userAvatar.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Đăng bài
  postForm.onsubmit = e => {
    e.preventDefault();
    
    if (!postContent.value.trim()) {
      alert("Vui lòng nhập nội dung bài đăng");
      return;
    }
    
    // Hiển thị loading state
    const submitBtn = postForm.querySelector("button[type='submit']");
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang đăng...";
    
    // Lấy thông tin người dùng hiện tại
    const currentUser = auth.currentUser;
    
    // Lấy avatar hiện tại từ database
    db.collection("users").doc(currentUser.uid).get().then(doc => {
      const userAvatarUrl = doc.exists ? doc.data().avatar : (currentUser.photoURL || "default-avatar.png");
      
      // Đăng bài mới
      return db.collection("posts").add({
        content: postContent.value,
        user: currentUser.displayName,
        userId: currentUser.uid,
        avatar: userAvatarUrl,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        likes: 0,
        likedBy: []
      });
    }).then(() => {
      // Hoàn thành
      postContent.value = "";
      submitBtn.textContent = "✓ Đã đăng";
      
      // Reset form sau 2 giây
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }, 2000);
    }).catch(error => {
      console.error("Lỗi đăng bài:", error);
      alert(`Lỗi khi đăng bài: ${error.message}`);
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    });
  };

  // Thêm CSS animation cho avatar
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(114, 137, 218, 0.7); }
      70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(114, 137, 218, 0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(114, 137, 218, 0); }
    }
    
    .pulse {
      animation: pulse 1s;
    }
  `;
  document.head.appendChild(style);
});
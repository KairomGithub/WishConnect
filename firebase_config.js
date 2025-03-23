// Import các thư viện Firebase cần thiết
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Cấu hình Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDVDHG2UdWjiS4v704pYJrp7A3m56Xigtw",
  authDomain: "wish-project-5b702.firebaseapp.com",
  projectId: "wish-project-5b702",
  storageBucket: "wish-project-5b702.appspot.com", // Sửa lỗi URL Storage
  messagingSenderId: "745722711656",
  appId: "1:745722711656:web:26bc91e59f528e0eeb35dd",
  measurementId: "G-2RVQHNVC3R"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Xuất để sử dụng trong các file khác
export { app, analytics, auth, db, storage };
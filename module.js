// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-analytics.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-storage.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-firestore.js";
import { collection, getDocs, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-firestore.js";
import { query, orderBy, limit, where, onSnapshot } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCZV_XLJJKY3BNRYjTsPd0UwatySYyFDFA",
  authDomain: "lapergraphy.firebaseapp.com",
  projectId: "lapergraphy",
  storageBucket: "lapergraphy.appspot.com",
  messagingSenderId: "608555494889",
  appId: "1:608555494889:web:7331cee4601cf66ae46f78",
  measurementId: "G-FENPGB90Z1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

var flow1Length = 0;
var flow2Length = 0;
var imageLoadedNum = 269;
var minimumScroll = 0;
var loadFinished = true;

let scrollPosition = window.scrollX;
let windowWidth = window.innerWidth;
let introPageWidth = windowWidth * 0.33 + 30;
let flowWidth = 0;

for (let i = 0; i < 20; i++) {
  await addImage();
  imageLoadedNum--;
  setTimeout(() => {
    Array.from(document.getElementsByClassName("photo")).forEach(element => {
      if (!element.classList.contains("photoLoaded")) {
        element.classList.add("photoLoaded");
      }
    });
  }, 10);
  if(i == 5) {
    document.getElementById("mouseReminder").setAttribute("id", "mouseReminderLoaded");
  }
}

async function addImage() {
  const storage = getStorage();
  const gsReference = ref(storage, 'JPG/Star_Citizen_' + padzero(imageLoadedNum, 5) + '.jpg');
  let childContainer = document.createElement("div");
  childContainer.setAttribute("class", "photo");
  childContainer.style.height = "30vh";
  let child = document.createElement("img");
  child.setAttribute("height", "100%");

  // Get the download URL
  await getDownloadURL(gsReference)
    .then((url) => {
      // Insert url into an <img> tag to "download"
      if (flow1Length <= flow2Length) {
        let flow = document.getElementById("flow1");
        child.setAttribute("src", url);
        childContainer.appendChild(child);
        flow.appendChild(childContainer);
        let img = new Image();
        img.src = url;
        img.onload = function () {
          flow1Length += (this.width / this.height);
        }
      } else {
        let flow = document.getElementById("flow2");
        child.setAttribute("src", url);
        childContainer.appendChild(child);
        flow.appendChild(childContainer);
        let img = new Image();
        img.src = url;
        img.onload = function () {
          flow2Length += (this.width / this.height);
        }
      }
    })
    .catch((error) => {
      // A full list of error codes is available at
      // https://firebase.google.com/docs/storage/web/handle-errors
      switch (error.code) {
        case 'storage/object-not-found':
          // File doesn't exist
          break;
        case 'storage/unauthorized':
          // User doesn't have permission to access the object
          break;
        case 'storage/canceled':
          // User canceled the upload
          break;
        case 'storage/unknown':
          // Unknown error occurred, inspect the server response
          break;
      }
    });
}

function padzero(num, size) {
  num = num.toString();
  while (num.length < size) num = "0" + num;
  return num;
}

async function addImagesAuto() {
  if(loadFinished == false) {
    return;
  }
  scrollPosition = window.scrollX;
  flowWidth = document.getElementsByClassName("photoFlow")[0].clientWidth;

  console.log("11111");
  console.log(scrollPosition + windowWidth);
  console.log("22222");
  console.log(document.body.scrollWidth);

  if (scrollPosition + windowWidth == document.body.scrollWidth - 1 && imageLoadedNum >= 0 && minimumScroll < document.body.scrollWidth) {
    loadFinished = false;
    minimumScroll = document.body.scrollWidth;
    for (let i = 0; i < 10; i++) {
      await addImage();
      imageLoadedNum--;
      setTimeout(() => {
        Array.from(document.getElementsByClassName("photo")).forEach(element => {
          if (!element.classList.contains("photoLoaded")) {
            element.classList.add("photoLoaded");
          }
        });
      }, 10);
      if (imageLoadedNum < 0) {
        break;
      }
    }
    loadFinished = true;
  }
}

document.addEventListener('scroll', () => addImagesAuto());
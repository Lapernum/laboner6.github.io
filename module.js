// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-analytics.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-storage.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-firestore.js";
import { collection, getDocs, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-firestore.js";
import { query, orderBy, limit, where, onSnapshot } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-firestore.js";
import imageInfo from './ImageInfo.json' assert {type: 'json'};
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBrj8-BGIyD7AUPaX_LuGy7XL7kcC4tQxY",
  authDomain: "lapergraphy-22beb.firebaseapp.com",
  projectId: "lapergraphy-22beb",
  storageBucket: "lapergraphy-22beb.appspot.com",
  messagingSenderId: "876429412626",
  appId: "1:876429412626:web:520b74ad91432797a58bcb",
  measurementId: "G-83W09R6F7H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

var imageLoadedNum = 0;
var minimumScroll = 0;
var loadFinished = true;

let scrollPosition = window.scrollX;
let windowWidth = window.innerWidth;
let viewHeight = 0.3 * window.innerHeight;
let introPageWidth = windowWidth * 0.33 + 30;
let flow1Index = [];
let flow2Index = [];
// const imageGroup = new Map();

console.log(windowWidth);
console.log(viewHeight);
console.log(introPageWidth);

// document.getElementsByClassName("photoFlow").style.width = "calc(30vh * " + imageInfo.FlowLength + ")";
let photoNum = imageInfo.Flow1Num + imageInfo.Flow2Num;
let flow1 = document.getElementById("flow1");
let flow2 = document.getElementById("flow2");

window.onbeforeunload = function () {
  window.scrollTo(0, 0);
}

for (let i = 0; i < photoNum; i++) {
  let thisdiv = document.createElement("div");
  thisdiv.style.height = "30vh";
  thisdiv.style.width = "calc(30vh * " + imageInfo.ImageInfo[i].WHRatio + ")";
  thisdiv.setAttribute("id", "photoContainer" + i);
  thisdiv.setAttribute("class", "photoContainer");
  if (imageInfo.ImageInfo[i].Flow == 1) {
    flow1Index.push(i);
    flow1.appendChild(thisdiv);
  } else if (imageInfo.ImageInfo[i].Flow == 2) {
    flow2Index.push(i);
    flow2.appendChild(thisdiv);
  }
}

for (let i = 0; i < 10; i++) {
  await addImage(i);
  imageLoadedNum++;
  if (i == 4) {
    document.getElementById("mouseReminder").setAttribute("id", "mouseReminderLoaded");
  }
}

setTimeout(() => {
  document.getElementById("mouseReminderLoaded").setAttribute("id", "mouseReminder");
}, 10000);

async function addImage(index) {
  // let imageCheck = document.getElementById("photoContainer" + index).hasChildNodes();
  // console.log(imageCheck);
  // if (imageCheck) {
  //   return;
  // }
  const storage = getStorage();
  const gsReference = ref(storage, 'JPG/' + imageInfo.ImageInfo[index].Name + '.jpg');
  let childContainer = document.createElement("div");
  childContainer.setAttribute("class", "photo");
  childContainer.style.height = "30vh";
  let background = document.createElement("div");
  background.setAttribute("class", "imageBackground");

  // Get the download URL
  await getDownloadURL(gsReference)
    .then((url) => {
      // Insert url into an <img> tag to "download"
      if (imageInfo.ImageInfo[index].Flow == 1) {
        let img = new Image();
        img.onload = function () {
          img.setAttribute("height", "100%");
          img.setAttribute("class", "imageInside");
          childContainer.appendChild(img);
          let flowContainer = document.getElementById("photoContainer" + index);
          childContainer.appendChild(background);
          if (!document.getElementById("photoContainer" + index).hasChildNodes()) {
            flowContainer.appendChild(childContainer);
            setTimeout(() => {
              childContainer.classList.add("photoLoaded");
            }, 10);
          }
        }
        img.src = url;
      } else if ((imageInfo.ImageInfo[index].Flow == 2)) {
        let img = new Image();
        img.onload = function () {
          img.setAttribute("height", "100%");
          img.setAttribute("class", "imageInside");
          childContainer.appendChild(img);
          let flowContainer = document.getElementById("photoContainer" + index);
          childContainer.appendChild(background);
          if (!document.getElementById("photoContainer" + index).hasChildNodes()) {
            flowContainer.appendChild(childContainer);
            setTimeout(() => {
              childContainer.classList.add("photoLoaded");
            }, 10);
          }
        }
        img.src = url;
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

async function addImagesAuto() {
  // if(loadFinished == false) {
  //   return;
  // }
  scrollPosition = window.scrollX;
  let leftBoundary = scrollPosition;
  let rightBoundary = scrollPosition + windowWidth;


  // if (scrollPosition %  == 0) {
  //   console.log("11111");
  //   console.log(scrollPosition + windowWidth);
  // }


  if (imageLoadedNum <= photoNum && scrollPosition % 100 == 0) {
    console.log("New Images Loading");
    console.log(leftBoundary);
    console.log(rightBoundary);
    let flow1LeftIndex = findImageIndex(flow1Index, 0, imageInfo.Flow1Num - 1, leftBoundary, true);
    let flow2LeftIndex = findImageIndex(flow2Index, 0, imageInfo.Flow2Num - 1, leftBoundary, true);
    let flow1RightIndex = findImageIndex(flow1Index, 0, imageInfo.Flow1Num - 1, rightBoundary, false);
    let flow2RightIndex = findImageIndex(flow2Index, 0, imageInfo.Flow2Num - 1, rightBoundary, false);
    // console.log(flow1LeftIndex);
    console.log(flow1Index[flow1LeftIndex]);
    console.log(flow1Index[flow1RightIndex]);
    console.log(flow2Index[flow2LeftIndex]);
    console.log(flow2Index[flow2RightIndex]);
    for (let i = flow1LeftIndex; i <= flow1RightIndex; i++) {
      await addImage(flow1Index[i]);
      imageLoadedNum++;
    }
    for (let j = flow2LeftIndex; j <= flow2RightIndex; j++) {
      await addImage(flow2Index[j]);
      imageLoadedNum++;
    }
  }
}

function findImageIndex(arr, l, r, boundary, isLeft) {
  if (r >= l) {
    let mid = l + Math.floor((r - l) / 2);
    let imagePositionLeft = 0;
    let imagePositionRight = 0;
    if (isLeft) {
      imagePositionLeft = imageInfo.ImageInfo[arr[mid]].PositionL * viewHeight + (imageInfo.ImageInfo[arr[mid]].Num - 1) * viewHeight / 15 + introPageWidth;
      imagePositionRight = imageInfo.ImageInfo[arr[mid]].PositionR * viewHeight + imageInfo.ImageInfo[arr[mid]].Num * viewHeight / 15 + introPageWidth;
    } else {
      imagePositionLeft = imageInfo.ImageInfo[arr[mid]].PositionL * viewHeight + imageInfo.ImageInfo[arr[mid]].Num * viewHeight / 15 + introPageWidth;
      imagePositionRight = imageInfo.ImageInfo[arr[mid]].PositionR * viewHeight + (imageInfo.ImageInfo[arr[mid]].Num + 1) * viewHeight / 15 + introPageWidth;
    }
    if (imagePositionLeft <= boundary && imagePositionRight >= boundary) {
      return mid;
    }
    if (imagePositionLeft > boundary) {
      return findImageIndex(arr, l, mid - 1, boundary, isLeft);
    }
    return findImageIndex(arr, mid + 1, r, boundary, isLeft);
  } else {
    return -1;
  }
}

async function loadLargeImage(index) {
  console.log("checkcheck");
  if (!document.getElementsByClassName("cover")[0].classList.contains("coverOn")) {
    document.getElementsByClassName("cover")[0].classList.add("coverOn");
  }
  if (!document.getElementsByClassName("largeImage")[0].classList.contains("largeImageOn")) {
    document.getElementsByClassName("largeImage")[0].classList.add("largeImageOn");
  }
  const storage = getStorage();
  const gsReference = ref(storage, 'PNG/' + imageInfo.ImageInfo[index].Name + '.png');
  let childContainer = document.createElement("div");
  childContainer.setAttribute("id", "largeImageContainer");
  let infoElement = document.createElement("p");
  let logo = document.createElement("img");
  logo.setAttribute("src", "./assets/logo_transparent_blue.png");
  logo.setAttribute("width", "15rem");
  logo.style.float = "right";
  let br1 = document.createElement("br");
  let infoNode = document.createTextNode("拍摄于 Shot at " + imageInfo.ImageInfo[index].DateModified);
  infoElement.appendChild(logo);
  infoElement.appendChild(br1);
  infoElement.appendChild(infoNode);
  infoElement.style.fontSize = "1rem";
  infoElement.style.fontWeight = "900";
  infoElement.style.color = "#335778";
  infoElement.style.float = "right";
  infoElement.style.marginRight = "12px";
  infoElement.style.marginTop = "5.3vh";
  infoElement.setAttribute("class", "infoElement");
  let noticeElement = document.createElement("p");
  let noticeNodeCN = document.createTextNode("完整分辨率版本");
  let br = document.createElement("br");
  let noticeNodeEN = document.createTextNode("Full Resolution Version")
  noticeElement.appendChild(noticeNodeCN);
  noticeElement.appendChild(br);
  noticeElement.appendChild(noticeNodeEN);
  noticeElement.style.fontSize = "0.7rem";
  noticeElement.style.fontWeight = "600";
  noticeElement.style.color = "#335778";
  noticeElement.style.float = "left";
  noticeElement.style.marginLeft = "12px";
  noticeElement.style.marginTop = "6.4vh";
  noticeElement.setAttribute("class", "noticeElement");
  await getDownloadURL(gsReference)
    .then((url) => {
      let img = new Image();
      img.onload = function () {
        img.setAttribute("id", "largeImageInside");
        if(imageInfo.ImageInfo[index].WHRatio >= window.innerWidth / window.innerHeight) {
          img.style.width = "70vw";
          childContainer.style.width = "70vw";
          childContainer.style.setProperty("height", "calc((70vw / " + imageInfo.ImageInfo[index].WHRatio + ") + 10vh)");
          childContainer.style.setProperty("margin-top", "calc((90vh - (70vw / " + imageInfo.ImageInfo[index].WHRatio + ")) / 2)");
        } else {
          img.style.height = "70vh";
          childContainer.style.height = "80vh";
          childContainer.style.setProperty("width", "calc(70vh * " + imageInfo.ImageInfo[index].WHRatio + ")");
          childContainer.style.setProperty("margin-top", "10vh");
        }
        childContainer.appendChild(img);
        childContainer.appendChild(infoElement);
        childContainer.appendChild(noticeElement);
        let largeImage = document.getElementsByClassName("largeImage")[0];
        largeImage.appendChild(childContainer);
        setTimeout(() => {
          childContainer.classList.add("largeImageLoaded");
          img.classList.add("largeImageLoaded");
        }, 100);
        setTimeout(() => {
          infoElement.classList.add("largeImageLoaded");
          noticeElement.classList.add("largeImageLoaded");
        }, 500);
      }
      img.src = url;
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

let allPhotoContainers = document.getElementsByClassName("photoContainer");

Array.from(allPhotoContainers).forEach((pc) => {
  pc.addEventListener("click", () => {
    let index = parseInt(pc.getAttribute("id").substring(14));
    loadLargeImage(index);
  });
})

// document.addEventListener('scroll', () => addImagesAuto());
window.onscroll = addImagesAuto;
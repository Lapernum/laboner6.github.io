// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-analytics.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-storage.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-firestore.js";
import { collection, getDocs, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-firestore.js";
import { query, orderBy, limit, where, onSnapshot } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-firestore.js";

const res = await fetch('./ImageInfo.json');
const imageInfo = await res.json();

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

// for release
const firebaseConfig = {
  apiKey: "AIzaSyBrj8-BGIyD7AUPaX_LuGy7XL7kcC4tQxY",
  authDomain: "lapergraphy-22beb.firebaseapp.com",
  projectId: "lapergraphy-22beb",
  storageBucket: "lapergraphy-22beb.appspot.com",
  messagingSenderId: "876429412626",
  appId: "1:876429412626:web:520b74ad91432797a58bcb",
  measurementId: "G-83W09R6F7H"
};

// // for testing
// const firebaseConfig = {
//   apiKey: "AIzaSyCZV_XLJJKY3BNRYjTsPd0UwatySYyFDFA",
//   authDomain: "lapergraphy.firebaseapp.com",
//   projectId: "lapergraphy",
//   storageBucket: "lapergraphy.appspot.com",
//   messagingSenderId: "608555494889",
//   appId: "1:608555494889:web:7331cee4601cf66ae46f78",
//   measurementId: "G-FENPGB90Z1"
// };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// var imageLoadedNum = 0;
// var minimumScroll = 0;
// var loadFinished = true;

let scrollPosition = window.scrollX;
let windowWidth = window.innerWidth;
let viewHeight = 0.3 * window.innerHeight;
let introPageWidth = windowWidth * 0.33 + 30;
let flow1Index = [];
let flow2Index = [];
let scrollOldValue = 0;
let autoLoadImage = true;
// const imageGroup = new Map();

// document.getElementsByClassName("photoFlow").style.width = "calc(30vh * " + imageInfo.FlowLength + ")";
let photoNum = imageInfo.Flow1Num + imageInfo.Flow2Num;
let flow1 = document.getElementById("flow1");
let flow2 = document.getElementById("flow2");
let flowJump = [];
let flowJumpMarker = reformatDateWithYear(photoNum - 1) + reformatDateWithMonth(photoNum - 1);
let flowJumpIndex = 0;

const scrollContainer = document.querySelector("html");
scrollContainer.addEventListener("wheel", (evt) => {
    evt.preventDefault();
    scrollContainer.scrollLeft += evt.deltaY + evt.deltaX;
}, { passive: false });

window.onbeforeunload = function () {
  window.scrollTo(0, 0);
}

flowJump.push({
  "jumpDate": flowJumpMarker,
  "jumpImageIndex": 0,
});

for (let i = photoNum - 1; i >= 0; i--) {
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
  if (reformatDateWithYear(i) + reformatDateWithMonth(i) < flowJumpMarker) {
    flowJumpMarker = reformatDateWithYear(i) + reformatDateWithMonth(i);
    flowJump.push({
      "jumpDate": flowJumpMarker,
      "jumpImageIndex": i,
    });
  }
}

for (let i = photoNum - 1; i >= photoNum - 10; i--) {
  await addImage(i);
  // imageLoadedNum++;
  if (i == photoNum - 4) {
    document.getElementById("mouseReminder").setAttribute("id", "mouseReminderLoaded");
    let dateDisplayContainer = document.getElementById("dateDisplayText");
    let dateDisplayYear = document.createElement("span");
    let dateDisplayMonth = document.createElement("b");
    dateDisplayYear.innerText = reformatDateWithYear(photoNum - 1);
    dateDisplayMonth.innerText = reformatDateWithMonth(photoNum - 1);
    dateDisplayYear.setAttribute("id", "dateDisplayYear");
    dateDisplayMonth.setAttribute("id", "dateDisplayMonth");
    dateDisplayContainer.appendChild(dateDisplayYear);
    dateDisplayContainer.appendChild(dateDisplayMonth);
    setTimeout(() => {
      document.getElementById("endPageStarCitizenLogo").style.opacity = "1";
      document.getElementById("dateDisplay").classList.add("dateDisplayLoaded");
      document.getElementById("scrollbar").classList.add("scrollbarLoaded");
      scrollbarResize();
    }, 100)
  }
}

function scrollbarResize() {
  scrollPosition = window.scrollX;
  windowWidth = window.innerWidth;
  viewHeight = 0.3 * window.innerHeight;
  introPageWidth = windowWidth * 0.33 + 30;
  let scrollbar = document.getElementById("scrollbar");
  let scrollbarInsideWidth = window.innerWidth * parseInt(window.getComputedStyle(scrollbar).width.slice(0, -2)) / document.body.scrollWidth;
  let scrollbarInside = document.getElementById("scrollbarInside");
  scrollbarInside.style.width = scrollbarInsideWidth + "px";
  addImagesAuto(true);
}

function scrollbarRelocate() {
  scrollPosition = window.scrollX;
  let scrollbarInside = document.getElementById("scrollbarInside");
  scrollbarInside.style.marginLeft = scrollPosition * parseInt(window.getComputedStyle(scrollbar).width.slice(0, -2)) / document.body.scrollWidth + "px";
}

window.onresize = scrollbarResize;

setTimeout(() => {
  document.getElementById("mouseReminderLoaded").setAttribute("id", "mouseReminder");
  Array.from(document.getElementsByClassName("dateArrow")).forEach((element) => {
    element.style.opacity = "0";
  })
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
          } else {
            img.remove();
            background.remove();
            childContainer.remove();
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
          } else {
            img.remove();
            background.remove();
            childContainer.remove();
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

async function addImagesAuto(changeDate) {
  scrollbarRelocate();
  if (autoLoadImage == false) {
    return;
  }
  scrollPosition = window.scrollX;
  let leftBoundary = scrollPosition;
  let rightBoundary = scrollPosition + windowWidth;
  // console.log(scrollPosition);

  // if (scrollPosition %  == 0) {
  //   console.log("11111");
  //   console.log(scrollPosition + windowWidth);
  // }
  if (Math.abs(scrollOldValue - scrollPosition) > 500) {
    scrollOldValue = scrollPosition;
    // console.log("New Images Loading");
    // console.log(leftBoundary);
    // console.log(rightBoundary);
    let flow1LeftIndex = findImageIndex(flow1Index, 0, imageInfo.Flow1Num - 1, leftBoundary, true);
    let flow2LeftIndex = findImageIndex(flow2Index, 0, imageInfo.Flow2Num - 1, leftBoundary, true);
    let flow1RightIndex = findImageIndex(flow1Index, 0, imageInfo.Flow1Num - 1, rightBoundary, false);
    let flow2RightIndex = findImageIndex(flow2Index, 0, imageInfo.Flow2Num - 1, rightBoundary, false);

    if (flow1LeftIndex == -1) {
      return;
    }

    if (changeDate) {
      document.getElementById("dateDisplayYear").innerText = reformatDateWithYear(flow1Index[flow1LeftIndex]);
      document.getElementById("dateDisplayMonth").innerText = reformatDateWithMonth(flow1Index[flow1LeftIndex]);
      // console.log(reformatDateWithYear(flow1Index[flow1LeftIndex]) + reformatDateWithMonth(flow1Index[flow1LeftIndex]));
      // console.log(flowJump[flowJumpIndex].jumpDate);
      if (reformatDateWithYear(flow1Index[flow1LeftIndex]) + reformatDateWithMonth(flow1Index[flow1LeftIndex]) > flowJump[flowJumpIndex].jumpDate) {
        flowJumpIndex--;
      } else if (reformatDateWithYear(flow1Index[flow1LeftIndex]) + reformatDateWithMonth(flow1Index[flow1LeftIndex]) < flowJump[flowJumpIndex].jumpDate) {
        flowJumpIndex++;
      }
    }
    // console.log(flow1LeftIndex);
    // console.log(flow1Index[flow1LeftIndex]);
    // console.log(flow1Index[flow1RightIndex]);
    // console.log(flow2Index[flow2LeftIndex]);
    // console.log(flow2Index[flow2RightIndex]);
    for (let i = flow1LeftIndex; i <= flow1RightIndex; i++) {
      await addImage(flow1Index[i]);
      // imageLoadedNum++;
    }
    for (let j = flow2LeftIndex; j <= flow2RightIndex; j++) {
      await addImage(flow2Index[j]);
      // imageLoadedNum++;
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

function reformatDate(date) {
  return date.substring(0, 4) + "." + date.substring(5, 7) + "." + date.substring(8, 13) + ":" + date.substring(14, 16) + ":" + date.substring(17, 19);
}

function reformatDateWithYear(index) {
  let thisDate = imageInfo.ImageInfo[index].DateModified;
  return thisDate.substring(0, 4) + " ";
}

function reformatDateWithMonth(index) {
  let thisDate = imageInfo.ImageInfo[index].DateModified;
  return thisDate.substring(5, 7);
}

async function loadLargeImage(index) {
  // console.log("checkcheck");
  Array.from(document.getElementsByClassName("largeImageContainer")).forEach((element) => {
    element.remove();
  })
  if (!document.getElementsByClassName("cover")[0].classList.contains("coverOn")) {
    document.getElementsByClassName("cover")[0].classList.add("coverOn");
  }
  if (!document.getElementsByClassName("largeImage")[0].classList.contains("largeImageOn")) {
    document.getElementsByClassName("largeImage")[0].classList.add("largeImageOn");
  }
  const storage = getStorage();
  const gsReference = ref(storage, 'PNG/' + imageInfo.ImageInfo[index].Name + '.png');
  let childContainer = document.createElement("div");
  childContainer.setAttribute("class", "largeImageContainer");
  let imgWithInfo = document.createElement("div");
  imgWithInfo.setAttribute("id", "largeImageWithInfo");
  let infoElementContainer = document.createElement("div");
  infoElementContainer.style.display = "flex";
  infoElementContainer.style.flexDirection = "row";
  infoElementContainer.style.justifyContent = "space-between";
  infoElementContainer.style.alignItems = "end";
  let infoNode = document.createElement("div");
  let infoElement = document.createElement("p");
  let logo = document.createElement("img");
  logo.setAttribute("src", "./assets/logo_transparent_blue.png");
  logo.setAttribute("width", "25rem");
  let br1 = document.createElement("br");
  let infoNodeCN = document.createTextNode("详细信息");
  let infoNodeEN = document.createTextNode("More Details");
  infoElement.appendChild(infoNodeCN);
  infoElement.appendChild(br1);
  infoElement.appendChild(infoNodeEN);
  infoElement.style.opacity = "0";
  infoElement.style.textAlign = "end";
  infoElement.style.margin = "0 0.5rem 0 0";
  infoElement.style.pointerEvents = "none";
  infoElement.style.transition = "all 0.5s";
  infoElement.setAttribute("id", "moreDetailsText");
  infoNode.appendChild(infoElement);
  infoNode.appendChild(logo);
  infoNode.style.fontSize = "0.7rem";
  infoNode.style.fontWeight = "900";
  infoNode.style.color = "#335778";
  infoNode.style.lineHeight = "150%";
  infoNode.style.margin = "0";
  infoNode.style.display = "flex";
  infoNode.style.flexDirection = "row";
  infoNode.style.alignItems = "center";
  infoNode.setAttribute("class", "infoElement");
  infoNode.setAttribute("id", "moreDetails");
  logo.style.opacity = "0";
  logo.setAttribute("id", "moreDetailsLogo");
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
  noticeElement.style.display = "flex";
  noticeElement.style.margin = "0";
  noticeElement.style.flexDirection = "column";
  noticeElement.style.justifyContent = "end";
  // noticeElement.style.transform = "translateY(-6px)";
  noticeElement.setAttribute("class", "noticeElement");
  await getDownloadURL(gsReference)
    .then((url) => {
      let img = new Image();
      img.onload = function () {
        img.setAttribute("class", "largeImageInside");
        if (imageInfo.ImageInfo[index].WHRatio >= window.innerWidth / window.innerHeight) {
          img.style.width = "70vw";
          childContainer.style.width = "70vw";
          childContainer.style.setProperty("height", "calc((70vw / " + imageInfo.ImageInfo[index].WHRatio + ") + 10vh)");
        } else {
          img.style.height = "70vh";
          childContainer.style.height = "80vh";
          childContainer.style.setProperty("width", "calc(70vh * " + imageInfo.ImageInfo[index].WHRatio + ")");
        }
        imgWithInfo.appendChild(img);
        childContainer.appendChild(imgWithInfo);
        infoElementContainer.appendChild(noticeElement);
        infoElementContainer.appendChild(infoNode);
        childContainer.appendChild(infoElementContainer);
        let largeImage = document.getElementsByClassName("largeImage")[0];
        Array.from(document.getElementsByClassName("largeImageContainer")).forEach((element) => {
          element.remove();
        })
        largeImage.appendChild(childContainer);

        infoNode.addEventListener("click", () => {
          let thisImage = document.getElementsByClassName("largeImageInside")[0];
          if(thisImage.classList.contains("largeImageInfoOn")) {
            thisImage.classList.remove("largeImageInfoOn");
            let imgInfo = document.getElementById("largeImageInfo");
            imgInfo.remove();
          } else {
            thisImage.classList.add("largeImageInfoOn");
            let imgInfo = document.createElement("div");
            imgInfo.style.color = "#335778";
            imgInfo.style.margin = "0 0 0 50px";
            imgInfo.style.position = "absolute";
            imgInfo.style.fontWeight = "900";
            imgInfo.style.transition = "all 0.5s";
            imgInfo.style.fontSize = "1.2rem";
            imgInfo.setAttribute("id", "largeImageInfo");
            let imgInfoDate = document.createElement("p");
            let imgInfoDateNode = document.createTextNode("拍摄于 Shot On " + reformatDate(imageInfo.ImageInfo[index].DateModified));
            if (imageInfo.ImageInfo[index].WHRatio >= window.innerWidth / window.innerHeight) {
              imgInfo.style.setProperty("transform", "translateY(calc((-70vw / " + imageInfo.ImageInfo[index].WHRatio + ") + 50px))");
            } else {
              imgInfo.style.setProperty("transform", "translateY(calc(-70vh + 50px)");
            }
            imgInfoDate.appendChild(imgInfoDateNode);
            imgInfo.appendChild(imgInfoDate);
            imgWithInfo.appendChild(imgInfo);
          }
        });
        document.getElementById("largeImageLoadingText").style.opacity = "0";
        setTimeout(() => {
          childContainer.classList.add("largeImageLoaded");
          infoNode.classList.add("largeImageLoaded");
          logo.classList.add("largeImageLoaded");
          noticeElement.classList.add("largeImageLoaded");
        }, 1);
        setTimeout(() => {
          img.classList.add("largeImageLoaded");
          infoElement.classList.add("largeImageLoaded");
        }, 600);
        setTimeout(() => {
          infoElement.classList.remove("largeImageLoaded");
        }, 5000);
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

let dateArrowLeft1 = document.getElementById("dateArrowLeft1");
let dateArrowLeft2 = document.getElementById("dateArrowLeft2");
let dateArrowRight1 = document.getElementById("dateArrowRight1");
let dateArrowRight2 = document.getElementById("dateArrowRight2");
// let infoElementNode = document.getElementById("moreDetails");

dateArrowLeft2.addEventListener("click", () => {
  dateArrowLeft2.style.pointerEvents = "none";
  autoLoadImage = false;
  flowJumpIndex = 0;
  window.scrollTo({ left: 0, behavior: 'smooth' });
  scrollbarRelocate();
  document.getElementById("dateDisplayYear").innerText = reformatDateWithYear(flow1Index[0]);
  document.getElementById("dateDisplayMonth").innerText = reformatDateWithMonth(flow1Index[0]);
  setTimeout(async () => {
    autoLoadImage = true;
    dateArrowLeft2.style.pointerEvents = "all";
  }, 800);
});

dateArrowRight2.addEventListener("click", () => {
  dateArrowRight2.style.pointerEvents = "none";
  autoLoadImage = false;
  flowJumpIndex = flowJump.length - 1;
  document.getElementById("endPage").scrollIntoView({ behavior: 'smooth' });
  scrollbarRelocate();
  document.getElementById("dateDisplayYear").innerText = reformatDateWithYear(0);
  document.getElementById("dateDisplayMonth").innerText = reformatDateWithMonth(0);
  setTimeout(async () => {
    autoLoadImage = true;
    dateArrowRight2.style.pointerEvents = "all";
    for (let i = 0; i < 10; i++) {
      await addImage(i);
    }
  }, 800);
});

dateArrowLeft1.addEventListener("click", () => {
  dateArrowLeft1.style.pointerEvents = "none";
  autoLoadImage = false;
  if (flowJumpIndex == 0) {
    dateArrowLeft1.style.pointerEvents = "all";
    return;
  }
  flowJumpIndex--;
  window.scrollTo({ left: imageInfo.ImageInfo[flowJump[flowJumpIndex].jumpImageIndex].PositionL * viewHeight + (imageInfo.ImageInfo[flowJump[flowJumpIndex].jumpImageIndex].Num - 1) * viewHeight / 15 + introPageWidth, behavior: 'smooth' });
  scrollbarRelocate();
  document.getElementById("dateDisplayYear").innerText = reformatDateWithYear(flowJump[flowJumpIndex].jumpImageIndex);
  document.getElementById("dateDisplayMonth").innerText = reformatDateWithMonth(flowJump[flowJumpIndex].jumpImageIndex);
  setTimeout(async () => {
    autoLoadImage = true;
    dateArrowLeft1.style.pointerEvents = "all";
    addImagesAuto(false);
  }, 800);
});

dateArrowRight1.addEventListener("click", () => {
  dateArrowRight1.style.pointerEvents = "none";
  autoLoadImage = false;
  if (flowJumpIndex == flowJump.length - 1) {
    dateArrowRight1.style.pointerEvents = "all";
    return;
  }
  flowJumpIndex++;
  window.scrollTo({ left: imageInfo.ImageInfo[flowJump[flowJumpIndex].jumpImageIndex].PositionL * viewHeight + (imageInfo.ImageInfo[flowJump[flowJumpIndex].jumpImageIndex].Num - 1) * viewHeight / 15 + introPageWidth, behavior: 'smooth' });
  scrollbarRelocate();
  document.getElementById("dateDisplayYear").innerText = reformatDateWithYear(flowJump[flowJumpIndex].jumpImageIndex);
  document.getElementById("dateDisplayMonth").innerText = reformatDateWithMonth(flowJump[flowJumpIndex].jumpImageIndex);
  setTimeout(async () => {
    autoLoadImage = true;
    dateArrowRight1.style.pointerEvents = "all";
    addImagesAuto(false);
  }, 800);
});

// document.addEventListener('scroll', () => addImagesAuto());
window.onscroll = () => addImagesAuto(true);
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

// var imageLoadedNum = 0;
// var minimumScroll = 0;
// var loadFinished = true;

let scrollPosition = window.scrollX;
let windowWidth = window.innerWidth;
let viewHeight = 0.35 * window.innerHeight;
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
let currIndex = 0;

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
  thisdiv.style.height = "35vh";
  thisdiv.style.width = "calc(35vh * " + imageInfo.ImageInfo[i].WHRatio + ")";
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

function getElementIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get('targetId');
  console.log("Obtained Element ID from URL:", targetId); // Log the element ID to the console
  return targetId;
}

function scrollToElementById(elementId) {
  // let dateArrowLeft1 = document.getElementById("dateArrowLeft1");
  // let dateArrowLeft2 = document.getElementById("dateArrowLeft2");
  // let dateArrowRight1 = document.getElementById("dateArrowRight1");
  // let dateArrowRight2 = document.getElementById("dateArrowRight2");

  const targetElement = document.getElementById("photoContainer" + elementId);
  if (targetElement) {
    // dateArrowLeft2.style.pointerEvents = "none";
    // autoLoadImage = false;
    console.log("Element found, attempting to scroll:", "photoContainer" + elementId);
    // window.location.hash = elementId;
    const xOffset = targetElement.offsetLeft; // 获取元素的顶部位置
    window.scrollTo({left: xOffset, behavior: 'instant'});
  } else {
    console.log('Element not found. Ensure the element ID is correct and the element is loaded on the page.');
  }
}

const targetId = getElementIdFromUrl();
if (targetId) {
  console.log("Target ID is present. About to scroll to:", targetId);
  scrollToElementById(targetId);

  let f = flowJump.length - 1;
  while (f >= 0) {
    if (reformatDateWithYear(targetId) + reformatDateWithMonth(targetId) <= flowJump[f].jumpDate) {
      flowJumpIndex = f;
      break;
    }
    f--;
  }
} else {
  console.log("No Target ID provided in URL.");
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
      document.getElementById("lightModeButton").classList.add("scrollbarLoaded");
      document.getElementById("darkModeButton").classList.add("scrollbarLoaded");
      scrollbarResize();
    }, 100)
  }
}

function scrollbarResize() {
  scrollPosition = window.scrollX;
  windowWidth = window.innerWidth;
  viewHeight = 0.35 * window.innerHeight;
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

function copyToClipboard(index) {
  navigator.clipboard.writeText("https://lapernum.site/?targetId=" + index);

  let linkIcon = document.getElementById("linkIcon");
  let checkIcon = document.getElementById("checkIcon");
  linkIcon.style.display = "none";
  checkIcon.style.display = "initial";

  setTimeout(() => {
    linkIcon.style.display = "initial";
    checkIcon.style.display = "none";
  }, 5000);
}

window.copyToClipboard = copyToClipboard;

window.onresize = scrollbarResize;

if (targetId != null) {
  setTimeout(() => {
    loadLargeImage(targetId);
  }, 2000);
}

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

  let childContainer = document.createElement("div");
  childContainer.setAttribute("class", "photo");
  childContainer.style.height = "35vh";
  let background = document.createElement("div");
  background.setAttribute("class", "imageBackground");

  // Define the B2 URL for the image
  const b2Url = 'https://img.lapernum.site/jpg/' + imageInfo.ImageInfo[index].Name + '.jpg';

  // Create an image element
  let img = new Image();
  img.onload = function () {
    img.setAttribute("height", "100%");
    img.setAttribute("class", "imageInside");

    let iconFullscreen = document.createElement("img");
    iconFullscreen.setAttribute("src", "./assets/fullscreen_image.svg");
    iconFullscreen.setAttribute("width", "60px");
    iconFullscreen.setAttribute("class", "fullscreenIcon");

    childContainer.appendChild(img);
    childContainer.appendChild(iconFullscreen);

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
  img.onerror = function (error) {
    // Handle errors like file not found, etc.
    console.error("Error loading image: ", error);
  };
  img.src = b2Url;
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

  const b2Url = 'https://img.lapernum.site/png/' + imageInfo.ImageInfo[index].Name + '.png';

  let childContainer = document.createElement("div");
  childContainer.setAttribute("class", "largeImageContainer");
  childContainer.style.userSelect = "none";
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
  logo.setAttribute("src", "./assets/logo_black.png");
  logo.setAttribute("width", "24px");
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
  infoNode.style.lineHeight = "150%";
  infoNode.style.margin = "0";
  infoNode.style.display = "flex";
  infoNode.style.flexDirection = "row";
  infoNode.style.alignItems = "center";
  infoNode.setAttribute("class", "infoElement");
  infoNode.setAttribute("id", "moreDetails");
  logo.style.opacity = "0";
  logo.setAttribute("id", "moreDetailsLogo");

  let leftNodes = document.createElement("div");

  let download = '<svg id="downloadIcon" xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>';
  // let download = document.createElement("img");
  // download.setAttribute("src", "./assets/download_icon.svg");
  // download.setAttribute("width", "32px");
  // download.setAttribute("id", "downloadIcon");
  let downloadHref = document.createElement("a")
  let noticeNode = document.createElement("div");
  noticeNode.setAttribute("class", "noticeNode");
  let noticeElement = document.createElement("a");
  noticeElement.setAttribute("href", b2Url);
  noticeElement.setAttribute("target", "_blank");
  noticeElement.style.textDecoration = "none";
  noticeElement.style.cursor = "pointer";
  let noticeNodeCN = document.createTextNode("完整分辨率版本");
  let br = document.createElement("br");
  let noticeNodeEN = document.createTextNode("Full Resolution Version")
  // noticeElement.appendChild(download);
  noticeElement.appendChild(noticeNodeCN);
  noticeElement.appendChild(br);
  noticeElement.appendChild(noticeNodeEN);
  // noticeElement.insertAdjacentHTML('afterbegin', download);
  noticeElement.style.fontSize = "0.65rem";
  noticeElement.style.fontWeight = "600";
  noticeElement.style.display = "flex";
  noticeElement.style.margin = "0";
  noticeElement.style.flexDirection = "column";
  noticeElement.style.justifyContent = "end";
  // noticeElement.style.transform = "translateY(-6px)";
  // noticeElement.style.opacity = "0";
  noticeElement.setAttribute("id", "noticeElement");
  // downloadHref.appendChild(download);
  downloadHref.insertAdjacentHTML('afterbegin', download);
  downloadHref.style.marginRight = "3px";
  downloadHref.style.marginBottom = "-1px"
  downloadHref.style.height = "30px";
  downloadHref.setAttribute("href", b2Url);
  downloadHref.setAttribute("target", "_blank");
  downloadHref.setAttribute("download", imageInfo.ImageInfo[index].Name + '.png');
  downloadHref.setAttribute("id", "downloadIconHref");

  noticeNode.appendChild(downloadHref);
  noticeNode.appendChild(noticeElement);
  noticeNode.style.display = "flex";
  noticeNode.style.flexDirection = "row";

  let linkShareNode = document.createElement("div");
  linkShareNode.setAttribute("class", "linkShareNode");
  linkShareNode.style.marginBottom = "10px";
  let share = '<svg id="linkIcon" xmlns="http://www.w3.org/2000/svg" height="32px" width="32px" style="cursor:pointer;marginRight:3px;marginBottom:-1px;height:30px" onclick="copyToClipboard(' + index + ')" viewBox="0 0 24 24"><path d="M10.59,13.41C11,13.8 11,14.44 10.59,14.83C10.2,15.22 9.56,15.22 9.17,14.83C7.22,12.88 7.22,9.71 9.17,7.76V7.76L12.71,4.22C14.66,2.27 17.83,2.27 19.78,4.22C21.73,6.17 21.73,9.34 19.78,11.29L18.29,12.78C18.3,11.96 18.17,11.14 17.89,10.36L18.36,9.88C19.54,8.71 19.54,6.81 18.36,5.64C17.19,4.46 15.29,4.46 14.12,5.64L10.59,9.17C9.41,10.34 9.41,12.24 10.59,13.41M13.41,9.17C13.8,8.78 14.44,8.78 14.83,9.17C16.78,11.12 16.78,14.29 14.83,16.24V16.24L11.29,19.78C9.34,21.73 6.17,21.73 4.22,19.78C2.27,17.83 2.27,14.66 4.22,12.71L5.71,11.22C5.7,12.04 5.83,12.86 6.11,13.65L5.64,14.12C4.46,15.29 4.46,17.19 5.64,18.36C6.81,19.54 8.71,19.54 9.88,18.36L13.41,14.83C14.59,13.66 14.59,11.76 13.41,10.59C13,10.2 13,9.56 13.41,9.17Z" /></svg>'
  // let share = document.createElement("img");
  // share.setAttribute("src", "./assets/link_icon.svg");
  // share.setAttribute("width", "32px");
  // share.setAttribute("id", "linkIcon");
  // share.setAttribute("onclick", "copyToClipboard(" + index + ")");
  // share.style.cursor = "pointer";
  // share.style.marginRight = "3px";
  // share.style.marginBottom = "-1px";
  // share.style.height = "30px";
  let check = '<svg id="checkIcon" xmlns="http://www.w3.org/2000/svg" fill="#2ea349" height="32px" width="32px" style="marginRight:3px;marginBottom:-1px;height:30px" viewBox="0 -960 960 960" width="24px"><path d="m424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>'

  let linkElement = document.createElement("p");
  linkElement.setAttribute("id", "linkElement");
  linkElement.setAttribute("onclick", "copyToClipboard(" + index + ")");
  linkElement.style.cursor = "pointer";
  let linkNodeCN = document.createTextNode("复制分享链接");
  let br2 = document.createElement("br");
  let linkNodeEN = document.createTextNode("Copy Link to Share")
  linkElement.appendChild(linkNodeCN);
  linkElement.appendChild(br2);
  linkElement.appendChild(linkNodeEN);
  linkElement.style.fontSize = "0.65rem";
  linkElement.style.fontWeight = "600";
  linkElement.style.display = "flex";
  linkElement.style.margin = "0";
  linkElement.style.flexDirection = "column";
  linkElement.style.justifyContent = "end";
  // linkElement.style.transform = "translateY(-6px)";
  // linkElement.style.opacity = "0";
  linkElement.setAttribute("id", "noticeElement");

  // linkShareNode.appendChild(share);
  linkShareNode.insertAdjacentHTML('afterbegin', check);
  linkShareNode.insertAdjacentHTML('afterbegin', share);
  linkShareNode.appendChild(linkElement);
  linkShareNode.style.display = "flex";
  linkShareNode.style.flexDirection = "row";

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
    leftNodes.appendChild(linkShareNode);
    leftNodes.appendChild(noticeNode);
    infoElementContainer.appendChild(leftNodes);
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
    }, 1);
    setTimeout(() => {
      img.classList.add("largeImageLoaded");
      infoElement.classList.add("largeImageLoaded");
      noticeElement.classList.add("largeImageLoaded");
      linkElement.classList.add("largeImageLoaded");
    }, 600);
    setTimeout(() => {
      infoElement.classList.remove("largeImageLoaded");
      noticeElement.classList.remove("largeImageLoaded");
      linkElement.classList.remove("largeImageLoaded");
    }, 5000);
  }
  img.src = b2Url;
}

let allPhotoContainers = document.getElementsByClassName("photoContainer");

Array.from(allPhotoContainers).forEach((pc) => {
  pc.addEventListener("click", () => {
    let index = parseInt(pc.getAttribute("id").substring(14));
    currIndex = index;
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
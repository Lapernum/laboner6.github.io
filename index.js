// const scrollContainer = document.querySelector("body");

// scrollContainer.addEventListener("wheel", (evt) => {
//   evt.preventDefault();
//   scrollContainer.scrollLeft += evt.deltaY;
// });

// function init() {
//   Array.from(document.getElementsByClassName("logoImg")).forEach(element => {
//     element.classList.add("logoPageLoaded");
//   });
//   Array.from(document.getElementsByClassName("mainline")).forEach(element => {
//     element.classList.add("logoPageLoaded");
//   });
//   Array.from(document.getElementsByClassName("subline")).forEach(element => {
//     element.classList.add("logoPageLoaded");
//   });
//   Array.from(document.getElementsByClassName("introPageContainer")).forEach(element => {
//     element.classList.add("introPageContainerLoaded");
//   });
// }

// function toggleIntro() {
//   if (document.getElementsByClassName("introPage")[0].classList.contains("introPageOpened")) {
//     document.getElementsByClassName("introPage")[0].classList.remove("introPageOpened");
//   } else {
//     document.getElementsByClassName("introPage")[0].classList.add("introPageOpened");
//   }
//   if (document.getElementsByClassName("introArrowContainer")[0].classList.contains("introArrowContainerOpened")) {
//     document.getElementsByClassName("introArrowContainer")[0].classList.remove("introArrowContainerOpened");
//   } else {
//     document.getElementsByClassName("introArrowContainer")[0].classList.add("introArrowContainerOpened");
//   }
//   if (document.getElementsByClassName("introArrow")[0].getAttribute("fill") == "#335778") {
//     document.getElementsByClassName("introArrow")[0].setAttribute("fill", "#FFF");
//   } else {
//     document.getElementsByClassName("introArrow")[0].setAttribute("fill", "#335778");
//   }
//   if (window.getComputedStyle(document.getElementsByClassName("introText")[0]).opacity == "0") {
//     document.getElementsByClassName("introText")[0].style.opacity = "1";
//   } else {
//     setTimeout(() => {
//       document.getElementsByClassName("introText")[0].style.opacity = "0";
//     }, 1000);
//   }
// };

// function closeLargeImage() {
//   if(document.getElementsByClassName("cover")[0].classList.contains("coverOn")) {
//     document.getElementsByClassName("cover")[0].classList.remove("coverOn");
//   }
//   if(document.getElementsByClassName("largeImage")[0].classList.contains("largeImageOn")) {
//     document.getElementsByClassName("largeImage")[0].classList.remove("largeImageOn");
//   }
//   Array.from(document.getElementsByClassName("largeImageContainer")).forEach((element) => {
//     element.remove();
//   })
//   setTimeout(() => {
//     document.getElementById("largeImageLoadingText").style.opacity = "1";
//   }, 500)
// }

// const scrollContainer = document.querySelector("body");

// scrollContainer.addEventListener("wheel", (evt) => {
//   evt.preventDefault();
//   scrollContainer.scrollLeft += evt.deltaY;
// });

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

function init() {
  console.log("Initialization started.");
  Array.from(document.getElementsByClassName("logoImg")).forEach(element => {
    element.classList.add("logoPageLoaded");
  });
  Array.from(document.getElementsByClassName("mainline")).forEach(element => {
    element.classList.add("logoPageLoaded");
  });
  Array.from(document.getElementsByClassName("subline")).forEach(element => {
    element.classList.add("logoPageLoaded");
  });
  Array.from(document.getElementsByClassName("introPageContainer")).forEach(element => {
    element.classList.add("introPageContainerLoaded");
  });

  const targetId = getElementIdFromUrl();
  if (targetId) {
    console.log("Target ID is present. About to scroll to:", targetId);
    scrollToElementById(targetId);
  } else {
    console.log("No Target ID provided in URL.");
  }
}

function toggleIntro() {
  if (document.getElementsByClassName("introPage")[0].classList.contains("introPageOpened")) {
    document.getElementsByClassName("introPage")[0].classList.remove("introPageOpened");
  } else {
    document.getElementsByClassName("introPage")[0].classList.add("introPageOpened");
  }
  if (document.getElementsByClassName("introArrowContainer")[0].classList.contains("introArrowContainerOpened")) {
    document.getElementsByClassName("introArrowContainer")[0].classList.remove("introArrowContainerOpened");
  } else {
    document.getElementsByClassName("introArrowContainer")[0].classList.add("introArrowContainerOpened");
  }
  if (document.getElementsByClassName("introArrow")[0].getAttribute("fill") == "#335778") {
    document.getElementsByClassName("introArrow")[0].setAttribute("fill", "#FFF");
  } else {
    document.getElementsByClassName("introArrow")[0].setAttribute("fill", "#335778");
  }
  if (window.getComputedStyle(document.getElementsByClassName("introText")[0]).opacity == "0") {
    document.getElementsByClassName("introText")[0].style.opacity = "1";
  } else {
    setTimeout(() => {
      document.getElementsByClassName("introText")[0].style.opacity = "0";
    }, 1000);
  }
};

function closeLargeImage() {
  if(document.getElementsByClassName("cover")[0].classList.contains("coverOn")) {
    document.getElementsByClassName("cover")[0].classList.remove("coverOn");
  }
  if(document.getElementsByClassName("largeImage")[0].classList.contains("largeImageOn")) {
    document.getElementsByClassName("largeImage")[0].classList.remove("largeImageOn");
  }
  Array.from(document.getElementsByClassName("largeImageContainer")).forEach((element) => {
    element.remove();
  })
  setTimeout(() => {
    document.getElementById("largeImageLoadingText").style.opacity = "1";
  }, 500)
}

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
  const savedTheme = localStorage.getItem('theme');
  console.log(savedTheme);
  if (savedTheme === 'light') {
    const style = document.createElement('style');
    style.innerHTML = `* {
        transition: none !important;
    }`;
    document.head.appendChild(style);
    switchToLight();
    document.head.removeChild(style);
  }
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
  if (document.getElementsByClassName("introPage")[0].classList.contains("introPageOpened")) {
    document.getElementById("introOpener").style.fill = "var(--background-color)";
    // document.getElementsByClassName("introArrow")[0].setAttribute("fill", "#FFF");
  } else {
    document.getElementById("introOpener").style.fill = "var(--main-color)";
    // document.getElementsByClassName("introArrow")[0].setAttribute("fill", "#335778");
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

function switchToLight() {
  const body = document.body;
  body.classList.toggle('light-theme');
  document.getElementById('lightModeButton').style.display = "none";
  document.getElementById('darkModeButton').style.display = "initial";
  document.getElementById('lightModeButton').style.pointerEvents = "none";
  document.getElementById('darkModeButton').style.pointerEvents = "all";
  document.getElementById('endSCLogo').setAttribute('src', './assets/STARCITIZEN_BLACK.png');
  document.getElementById('introPageSCLogo').setAttribute('src', './assets/STARCITIZEN_WHITE.png');
  document.getElementById('introPageMyLogo').setAttribute('src', './assets/logo_white.png');
  localStorage.setItem('theme', 'light');
}

function switchToDark() {
  const body = document.body;
  body.classList.toggle('light-theme');
  document.getElementById('darkModeButton').style.display = "none";
  document.getElementById('lightModeButton').style.display = "initial";
  document.getElementById('darkModeButton').style.pointerEvents = "none";
  document.getElementById('lightModeButton').style.pointerEvents = "all";
  document.getElementById('endSCLogo').setAttribute('src', './assets/STARCITIZEN_WHITE.png');
  document.getElementById('introPageSCLogo').setAttribute('src', './assets/STARCITIZEN_BLACK.png');
  document.getElementById('introPageMyLogo').setAttribute('src', './assets/logo_black.png');
  localStorage.setItem('theme', 'dark');
}

// function switchColor() {
//   const lightModeButton = document.getElementById('lightModeButton');
//   const darkModeButton = document.getElementById('darkModeButton');
//   const body = document.body;

//   lightModeButton.addEventListener('click', () => {
//       body.classList.toggle('dark-theme');
//       // Optional: Save the user's preference in localStorage
//       // const currentTheme = body.classList.contains('dark-theme') ? 'dark' : 'light';
//       // localStorage.setItem('theme', currentTheme);
//   });

//   darkModeButton.addEventListener('click', () => {
//       body.classList.toggle('light-theme');
//       // Optional: Save the user's preference in localStorage
//       // const currentTheme = body.classList.contains('dark-theme') ? 'dark' : 'light';
//       // localStorage.setItem('theme', currentTheme);
//   });

//   // // On page load, check for the saved theme
//   // window.addEventListener('DOMContentLoaded', () => {
//   //     const savedTheme = localStorage.getItem('theme');
//   //     if (savedTheme === 'dark') {
//   //         body.classList.add('dark-theme');
//   //     }
//   // });
// }
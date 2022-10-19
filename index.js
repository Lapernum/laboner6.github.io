// const scrollContainer = document.querySelector("body");

// scrollContainer.addEventListener("wheel", (evt) => {
//   evt.preventDefault();
//   scrollContainer.scrollLeft += evt.deltaY;
// });

function init() {
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
  if (document.getElementsByClassName("introArrow")[0].getAttribute("fill") == "#335778") {
    document.getElementsByClassName("introArrow")[0].setAttribute("fill", "#FFF");
  } else {
    document.getElementsByClassName("introArrow")[0].setAttribute("fill", "#335778");
  }
};
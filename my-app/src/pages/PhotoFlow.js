import React, { useState, useEffect } from 'react';
import Photo from './Photo';
import {createRoot} from 'react-dom/client';

import './PhotoFlow.css';

function PhotoFlow() {
  const [imagesFlowOne, setimagesFlowOne] = useState([]);
  const [imagesFlowTwo, setimagesFlowTwo] = useState([]);
  const imagesFlowOneTemp = [];
  const imagesFlowTwoTemp = [];
  // const [loaded, setloaded] = useState(false);
  const [imageLoaded, setimageLoaded] = useState(10);
  const [flow1Length, setflow1Length] = useState(0);
  const [flow2Length, setflow2Length] = useState(0);
  const images = function (r) {
    let k = r.keys();
    let l = r.keys().map(r);
    let d = {};
    for (let i = 0; i < l.length; i++) {
      d[k[i].replace(/^.*[\\/]/, '').replace(/\.(png|jpe?g|svg|JPE?G)$/, '')] = l[i];
    }
    return d;
  }(require.context('../test_images/', true, /\.(png|jpe?g|svg|JPE?G)$/));

  // for (let i = 0; i < Object.keys(images).length; i++) {
  //   if (i % 2 == 0) {
  //     imagesFlow1.push(images[Object.keys(images)[i]]);
  //   } else {
  //     imagesFlow2.push(images[Object.keys(images)[i]]);
  //   }
  // }

  useEffect(() => {
    // call api or anything
    setimagesFlowOne([]);
    setimagesFlowTwo([]);
    console.log("loaded");
    // setTimeout(() => setloaded(true), 100);

    for (let i = 0; i < 10; i++) {
      if (flow1Length <= flow2Length) {
        // let flow = document.getElementById("flow1");
        // let child = <Photo path={path} index={1} />;
        // flow.render(child);
        imagesFlowOneTemp.push(images[Object.keys(images)[i]]);
        let img = new Image();
        img.src = images[Object.keys(images)[i]];
        img.onload = function () {
          setflow1Length(flow1Length + (this.width / this.height));
        }
      } else {
        // let flow = document.getElementById("flow2");
        // let child = <Photo path={path} index={2} />;
        // flow.render(child);
        imagesFlowTwoTemp.push(images[Object.keys(images)[i]]);
        let img = new Image();
        img.src = images[Object.keys(images)[i]];
        img.onload = function () {
          setflow2Length(flow2Length + (this.width / this.height));
        }
      }
      // addImage(images[Object.keys(images)[i]]);
    }

    console.log(imagesFlowOneTemp);
    console.log(imagesFlowTwoTemp);

    setimagesFlowOne(imagesFlowOneTemp);
    setimagesFlowTwo(imagesFlowTwoTemp);

    console.log(imagesFlowOne);

    document.addEventListener('scroll', (e) => {
      let scrollPosition = window.scrollX;
      let windowWidth = window.innerWidth;
      let introPageWidth = windowWidth * 0.33 + 30;
      let flowWidth = document.getElementsByClassName("flow2")[0].clientWidth;

      while (scrollPosition + windowWidth > introPageWidth + flowWidth + 50) {
        if (flow1Length <= flow2Length) {
          // let flow = document.getElementById("flow1");
          // let child = <Photo path={path} index={1} />;
          // flow.render(child);
          setimagesFlowOne(imagesFlowOne.concat(images[Object.keys(images)[imageLoaded]]));
          let img = new Image();
          img.src = images[Object.keys(images)[imageLoaded]];
          img.onload = function () {
            setflow1Length(flow1Length + (this.width / this.height));
          }
        } else {
          // let flow = document.getElementById("flow2");
          // let child = <Photo path={path} index={2} />;
          // flow.render(child);
          setimagesFlowTwo(imagesFlowTwo.concat(images[Object.keys(images)[imageLoaded]]));
          let img = new Image();
          img.src = images[Object.keys(images)[imageLoaded]];
          img.onload = function () {
            setflow2Length(flow2Length + (this.width / this.height));
          }
        }
        // addImage(images[Object.keys(images)[imageLoaded]]);
        setimageLoaded(imageLoaded + 1);
      }
    });
  }, []);
  return (
    <div className="photoFlow">
      <div id="flow1">
        {imagesFlowOne.map((item, index) => {
          return <Photo path={item} index={1} key={index} />;
        })}
      </div>
      <div id="flow2">
        {imagesFlowTwo.map((item, index) => {
          return <Photo path={item} index={2} key={index} />;
        })}
      </div>
    </div>
  );
}



export default PhotoFlow;

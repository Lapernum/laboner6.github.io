import React, { useState, useEffect } from 'react';

import logo from '../assets/logo_transparent_blue.png';
import PhotoFlow from './PhotoFlow';
import './Photography.css';

function Photography() {
  const [loaded, setloaded] = useState(false);
  const [introed, setintroed] = useState(false);
  useEffect(() => {
    // call api or anything
    console.log("loaded");
    setTimeout(() => setloaded(true), 100);
    // setloaded(true);
  }, []);
  return (
    <div className="Photography">
      <div className={"logoPage"}>
        <img src={logo} width="100px" className={"logoImg" + (loaded ? " logoPageLoaded" : "")}></img>
        <h1 className={"mainline" + (loaded ? " logoPageLoaded" : "")}><span>「</span>影記<span>」</span></h1>
        <h1 className={"subline" + (loaded ? " logoPageLoaded" : "")}>拉邦那</h1>
        <h1 className={"subline" + (loaded ? " logoPageLoaded" : "")}>星际公民</h1>
        <h1 className={"subline englishTitle" + (loaded ? " logoPageLoaded" : "")}>A Star Citizen Photography,</h1>
        <h1 className={"subline englishTitle" + (loaded ? " logoPageLoaded" : "")}>By Lapernum.</h1>
        <div className={"introPageContainer" + (loaded ? " introPageContainerLoaded" : "")}>
          <div className={"introPage" + (introed ? " introPageOpened" : "")}>
            <div onClick={() => { setintroed(!introed); console.log(introed); }} style={{ transform: `rotate(${introed ? -180 : 0}deg)`, transition: `all 0.2s cubic-bezier(0.56, 0.01, 0.08, 0.99) 0.8s` }}>
              <svg className="introArrow" xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill={introed ? "#FFF" : "#335778"} class="bi bi-arrow-up-short" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M8 12a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 .5.5z" />
              </svg>
            </div>
            <div className='introText'>
              <img src={logo} width="50px" className={"introLogoImg"}></img>
              <p>我是拉邦那。</p>
              <p className='englishIntro'>I'm Lapernum.</p>
              <br />
              <p>一名星际公民，一位摄影爱好者，一位up主。</p>
              <p className='englishIntro'>A Star Citizen, A Photographer, A Content Creator.</p>
              <br />
              <p>哔哩哔哩</p>
              <p className='englishIntro'>Bilibili</p>
              <a target='_blank' href='https://space.bilibili.com/57234212'>@拉邦那Lapernum</a>
              <p><br />YouTube</p>
              <a target='_blank' href='https://www.youtube.com/channel/UCPEzUOCC_9COTUwx4HA5_Gw'>@Lapernum</a>
              <p><br />推特</p>
              <p className='englishIntro'>Twitter</p>
              <a target='_blank' href='https://twitter.com/laboner233'>@laboner233</a>
              <p><br />QQ讨论群</p>
              <p className='englishIntro'>QQ Group Chat</p>
              <p>1004915015</p>
            </div>
          </div>
        </div>
      </div>
      <PhotoFlow/>
    </div>
  );
}

export default Photography;

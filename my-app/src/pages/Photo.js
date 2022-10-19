import React, { useState, useEffect } from 'react';

import './Photo.css';

function Photo({ filepath, index }) {
    const [loaded, setloaded] = useState(false);
    useEffect(() => {
        // call api or anything
        console.log("loaded");
        setTimeout(() => setloaded(true), index == 1 ? 400 : 600);
        // setloaded(true);
    }, []);
    return (
        <div className={"photo" + (loaded ? " photoLoaded" : "")}>
            <div style={{ height: "30vh" }}>
                <img src={filepath} height="100%"></img>
            </div>
        </div>
    );
}

export default Photo;

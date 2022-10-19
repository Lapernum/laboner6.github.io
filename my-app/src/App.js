import './App.css';
import Photography from './pages/Photography';
import { useCallback, useEffect } from 'react';

function App() {
  // const scrollContainer = document.querySelector("body");
  // const handleScroll = useCallback(evt => {
  //   evt.preventDefault();
  //   scrollContainer.scrollLeft += evt.deltaY;
  // }, [])

  // useEffect(() => {
  //   scrollContainer.addEventListener("wheel", handleScroll);

  //   return () => {
  //     scrollContainer.removeEventListener("wheel", handleScroll);
  //   }
  // }, [handleScroll])

  return (
    <div className="App">
      <Photography />
    </div>
  );
}

export default App;

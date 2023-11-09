import React from 'react';

import './App.scss';
// import SampleHitTest2 from './sample/SampleHitTest2';

// import logo from './logo.svg';
import MeasurementAR from './component/measurement-ar/MeasurementAR';
// import Line from './sample/line/Line';

const App = () => {
  return (
    <div className='app'>
      <header className='app__header'>Object Measurement APP</header>
      {/* <SampleHitTest2 /> */}
      <MeasurementAR />

      {/* <Line /> */}
    </div>
  );
};

export default App;

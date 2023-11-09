AFRAME.registerComponent('weather-details', {
  init: function () {
    this.el.addEventListener('loaded', this.updateLocation.bind(this));
  },
  updateLocation: async () => {
    const weatherDetails = document.getElementById('weatherDetails');
    navigator.geolocation.getCurrentPosition(async (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      const apiKey = '268500a05fc4bc936fac15dd8b25933a';
      const weatherUrl = 'https://api.openweathermap.org/data/2.5/weather';

      let city, description, temperature, icon;

      await fetch(`${weatherUrl}?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`)
        .then((response) => response.json())
        .then((data) => {
          description = data.weather[0].description;
          temperature = data.main.temp;
          city = data.name;
          icon = data.weather[0].icon;
        })
        .catch((error) => {
          console.error('Error fetching weather data:', error);
        });

      // Setting the text attributes
      weatherDetails.setAttribute('value', `${city}\t\t${temperature}°C\n\n${description}`);
      weatherDetails.setAttribute('visible', true);
      weatherDetails.setAttribute('look-at', '[gps-camera]');


      const scene = document.querySelector('a-scene');

      const assets = document.createElement('a-assets');

      // Creating image element for setting the icon and append it to the assets
      const img = document.createElement('img')
      img.setAttribute("src", `http://openweathermap.org/img/wn/${icon}.png`);
      img.setAttribute('id', 'image');
      img.setAttribute('crossorigin', 'anonymous')

      assets.appendChild(img);
      scene.appendChild(assets);

      // Create an image entity and add it to the scene
      const imageEntity = document.createElement('a-image');
      imageEntity.setAttribute('src', '#image');
      imageEntity.setAttribute('position', '.9 2.2 -2');
      imageEntity.setAttribute('scale', '.6 .6 .6');
      scene.appendChild(imageEntity);
    });
  },
});

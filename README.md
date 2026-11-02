# Mapping the Michelin Sky

A scrollytelling data story about who earns a Michelin star and why. It opens with the Michelin star drawn as a constellation, then shows a world map of about 700 starred restaurants. Click a dot to see a restaurant's details.

## Setup

1. Clone this repo.
2. Download the dataset from Kaggle: https://www.kaggle.com/datasets/jackywang529/michelin-restaurants
3. Unzip it into a `dataset` folder at the root of the repo, so you have:

   ```
   dataset/
     one-star-michelin-restaurants.csv
     two-stars-michelin-restaurants.csv
     three-stars-michelin-restaurants.csv
   ```

4. Start a local server from the repo root (opening `index.html` directly won't load the data):

   ```sh
   python3 -m http.server 8000
   ```

5. Open http://localhost:8000

## Files

- `index.html`: page content
- `style.css`: styles
- `script.js`: constellation and map
- `dataset/`: the three Kaggle CSVs

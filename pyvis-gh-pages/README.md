# PyVis GitHub Pages Project

This project demonstrates how to create and deploy visualizations using the PyVis library on GitHub Pages.

## Project Structure

```
pyvis-gh-pages
├── src
│   └── visualize_pyvis.py      # Python code for generating visualizations
├── docs
│   └── index.html              # Main HTML page for GitHub Pages
├── .github
│   └── workflows
│       └── gh-pages.yml        # GitHub Actions workflow for deployment
├── requirements.txt             # Python dependencies
└── README.md                    # Project documentation
```

## Setup Instructions

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/pyvis-gh-pages.git
   cd pyvis-gh-pages
   ```

2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

## Usage

To generate visualizations, run the `visualize_pyvis.py` script located in the `src` directory. This script contains functions to create and manipulate network graphs using the PyVis library.

Example command:
```
python src/visualize_pyvis.py
```

## Visualizations

The visualizations created by the `visualize_pyvis.py` script can be viewed in the `docs/index.html` file. This file is served on GitHub Pages and includes the necessary scripts and styles to display the visualizations.

## Deployment

The project is automatically deployed to GitHub Pages using the GitHub Actions workflow defined in `.github/workflows/gh-pages.yml`. This workflow builds the documentation and pushes it to the `gh-pages` branch whenever changes are made to the main branch.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
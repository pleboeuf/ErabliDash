function createXYGraphPopup(data, title, xLabel, yLabel) {
    // Data should be an array of objects, like: [{x: 1, y: 2}, {x: 3, y: 5}]
  
    if (!Array.isArray(data) || data.length === 0) {
      console.error("Invalid data provided for the graph.");
      return;
    }
  
    const popup = window.open("", "XY Graph", "width=800,height=600");
    if (!popup) {
      alert("Popup blocker detected. Please allow popups for this site to view the graph.");
      return;
    }
  
    popup.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title || "XY Graph"}</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body {
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f0f0f0;
          }
          canvas {
            max-width: 90%;
            max-height: 90%;
          }
        </style>
      </head>
      <body>
        <canvas id="myChart"></canvas>
        <script>
          const ctx = document.getElementById('myChart').getContext('2d');
          const myChart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: [${data.map(point => point.x).join(',')}],
              datasets: [{
                label: '${title || "XY Data"}',
                data: [${data.map(point => point.y).join(',')}],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
              }]
            },
            options: {
              scales: {
                x: {
                  title: {
                    display: true,
                    text: '${xLabel || "X-axis"}'
                  }
                },
                y: {
                  title: {
                    display: true,
                    text: '${yLabel || "Y-axis"}'
                  }
                }
              }
            }
          });
        </script>
      </body>
      </html>
    `);
  
    popup.document.close();
  }
 function dograph(){ 
  // Example usage:
  const graphData = [
    { x: 1, y: 10 },
    { x: 2, y: 15 },
    { x: 3, y: 13 },
    { x: 4, y: 18 },
    { x: 5, y: 20 },
    { x: 6, y: 17 }
  ];
  
  // Call the function to create the graph popup
  //createXYGraphPopup(graphData, "My Data Graph", "Time (s)", "Value");
  
  //Example with no labels.
  createXYGraphPopup(graphData);
 }
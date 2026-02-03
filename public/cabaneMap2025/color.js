let testrandom= false ;
/*
let rgb1 = [255, 0, 0]   ; // red
let rgb2 = [255, 255, 0]  ;// yellow
let rgb3 = [0, 128, 0]  ;// vert

function getPoint(d, a1, a2) {
  // find a color d% between a1 and a2
  return a1.map((p, i) => Math.floor(a1[i] + d * (a2[i] - a1[i])))
}

22,18,15,14
// for demo purposes fill a canvas
for (let i = 0, j = 0; i < 1; i += .002, j++) {
  let rgb = getPoint(i, rgb1, rgb2)
  ctx.fillStyle = `rgba(${rgb.join(",")}, 1)`
  ctx.fillRect(j, 0, 1, 200);
}


// Log to console
console.log(message)
let canvas = document.getElementById('canvas')
var ctx = canvas.getContext('2d');
let canvas2 = document.getElementById('canvas2')
var ctx2 = canvas.getContext('2d');

*/
let rgb1 = [255, 0, 0]    // red
let rgb2 = [255, 255, 0]  // yellow
let rgb3 = [0, 125, 0]  // grene
function getPoint2(d, a1, a2) {
  // find a color d% between a1 and a2
  if (d<0) d=0;
  m= a1.map((p, i) => Math.floor(a1[i] + d * (a2[i] - a1[i])));
  return "rgba(" + m.join(",", 1) + ")" ;
}

function getPoint(d, a1, a2) {
  
    if (d<0) d=0;
    var rgb= a1.map((p, i) => Math.floor(a1[i] + d * (a2[i] - a1[i]))).join(",");
    return  "rgba(" + rgb + ",1)" ;
   // return rgba ;
   // return "rgba(" + a1.map((p, i) => Math.floor(a1[i] + d * (a2[i] - a1[i]))).join(",", 1) + ")" ;
}
function findColorRgba  (test) {
        var color;
        test=test*-1.0; // temp positive
        if (testrandom){
            // find a color d% between a1 and a2
            // radom for test
            let maxi = 21 ; 
            let mini = 13 ;
            let d= Math.random() ;
            test= (d * (maxi-mini+1) + mini);
            
            //
        
           }

        if (test < 11) { // red yellow
        return getPoint(0, rgb1, rgb2);
        }
        else if(test < 16) { // red yellow
            return getPoint((test-11.0)/5.0, rgb1, rgb2);
        } else if(test < 21) {  // yellow green
            return getPoint((test-16.0)/5.0, rgb2, rgb3);
        } else return(getPoint(1, rgb2, rgb3));
        
        return(color);
//        } else
//            return('blue'); // pas de valeur
    };

    function rcolor(){
        // find a color d% between a1 and a2
    // radom for test
    let maxi = 21 ; 
    let mini = 17 ;
    d= Math.random() ;
    d= -(d * (maxi-mini+1) + mini);
    return (d);
    //

    }

function testcolor(){
for (let i = 0 ; i > -22; i--) {

 
  let rgb = findColorRgba(i);
// console.log (i + " = " + rgb + " -- " + `rgba(${rgb.join(",")}, 1)` );
  console.log (i + " = " + rgb );
}
}
/*
// for demo purposes fill a canvas
for (let i = 0, j = 0; i < 1; i += .2, j++) {
  let rgb = getPoint(i, rgb2, rgb3)
  ctx2.fillStyle = `rgba(${rgb.join(",")}, 1)`
  ctx2.fillRect(j*100, 100, 100, 200);
}*/

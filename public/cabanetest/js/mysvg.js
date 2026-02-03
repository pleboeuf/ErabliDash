/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var vac = [];
var vact = [];
//////test


dateMessage = new Date();
dateMessage.setTime(Date.parse("2019-03-04T17:25:59.690Z"));
var WARNING = 20 * 60 * 1000; // 20 min
var OFFLINE = 40 * 60 * 1000; // 40 min

var t0, d = new Date();
var d = new Date(dateMessage);
var t0 = new Date(dateMessage - OFFLINE); //now moins 30 min


function test() {
    creevac(vacuum);
    setTimeout(updatevac, 3000, vacuum2);
//   vacuum2.forEach(function(va,index){
//               var msec = updatediv(va.code,va);
//               add_warning(va.code,msec);

    //   setTimeout(updatevac,3000*index,[va]); //updatevac(arr) 
    //   });


    /*
     var arr = [1, 3, 4];
     arr.forEach(function (id) {
     tcreerdiv(id, "#tabvac", (id * 1.2).toFixed(1));
     });
     updatePile(1, 4.2);
     delai_cone(1,true);     delai_cone(3,true);
     
     */
}
function add_warning(id, msec) {
    var text = (msec / 60000).toFixed(0);//moment(msec).format('mm:ss');
    var deb = "<div id=w" + id + " class=warning-container>" + text;
    var fin = "</div>";
    $(deb + fin).appendTo("#b" + id);
}
function update_warning(id, msec) {
    var color = msec < MAXDELAI ? 'green' : 'red';
    var text = vacOff[id] ? "" : ((MAXDELAI-msec) / 60000).toFixed(0);
    //   moment(msec).format('mm:ss');
    var txt = '<span style="float:right;color:' + color + ';">' + text + '</span>';
    $("#w" + id).html(txt);
}
function delai_cone(id, toggle) {
    if (toggle) { //o
        $('#b' + id).addClass("delai");
        //css('background-image','url("css/images/cone.jpg")';);

// /cabane/css/images/traffic_cone_orange.png)');
        //css("background-color",  "rgba(244, 152, 66,0.8)");

        //"url(css/images/traffic_cone_orange.png)");

    }
}
function tcreerdiv(newid, dest, temp) {
    var sp = "&nbsp;";


    var deb = "<div id=b" + newid + " class=mytext-container>";
    var fin = "</div>";

    var datadivdeb = "<div id=" + newid + ">";
///hack(vac) + sp + temp + deg 
    var datadivfin = creerTitreDiv(newid, temp, true) + fin; ///// "<br>" + res + fin;
    var prgBardiv = "<div id=P" + newid + " class=BlueBar style='height:7px;'>" + fin;
    var total = deb + fin;
    var divid = datadivdeb + datadivfin;
    $(total).appendTo(dest);
    $(divid).appendTo("#b" + newid);
//        creerPile("b" + newid, newid, vac.batteryVolt);
    creerPile("b" + newid, newid, 50);
    $(prgBardiv).appendTo("#b" + newid);
    $("#b" + newid).css('border-color', findColorPB(-19));
    $("#P" + newid).progressbar({max: 20 * 60 * 1000, value: 65});

}
function creerPile(dest, id, pctchrg) {
    if (undefined === pctchrg)
        pctchrg = 0;
    appendDiv(dest, id);
    creerCanvas(id, id);
    dessinePile(id);
    updatePile(id, pctchrg);
//    }
}
function appendDiv(dest, newid) {
    var deb = "<div id=Bat" + newid + ">"; //class=batt-container>";
    var fin = "</div>";
    var total = deb + fin;
    $(total).appendTo("#" + dest);
}
var wt = 80;
var ht = wt / 1.5;
var border = wt / 20;
var pilewt = wt - 2 * border;
var pileht = ht - 3 * border;
var btdepx = border + pilewt;
var btdepy = border + pileht / 3;
var btw = pilewt / 20;
var bth = pileht / 3;

function creerCanvas(dest, id) {

    var canvas = "<canvas id=Can" + id +
            " width=" + wt + " height=" + ht + "> </canvas>";
    $(canvas).appendTo("#Bat" + dest);

}
function dessinePile(id) {
    var c = document.getElementById("Can" + id);
    var ctx = c.getContext('2d');
    ctx.strokeRect(border, border, pilewt, pileht);
    ctx.strokeRect(btdepx, btdepy, btw, bth);

}
//+" style='border:1px solid #34333f;

function updatePile(id, pctchrg) {    
	if (undefined !== pctchrg) { // si il y a un pctchrgage 

//    var pourcent = volt / 5.0 * 100;
    var pourcent = pctchrg;
    var v = parseInt((pctchrg / 20).toFixed(0));  // un chiffre de 0-5
    var vtext = pctchrg.toFixed(0) + '%'; // %
    switch (v) {
        case 3:
            couleur = 'yellow';
            break;
        case 4:
        case 5:
            couleur = 'green';
            break;
        case 2:
        case 1:
            couleur = 'red';
            break;
        default:
            couleur = '#9A9A97';
            pourcent = 100;  // hack pour mettre off au lieu du pourcentage
            vtext = "OFF";   // sur fond gris
            break;
    }
    var c = document.getElementById("Can" + id);
    var ctx = c.getContext('2d');
    ctx.clearRect(border, border, pilewt, pileht);
    ctx.fillStyle = couleur;
    ctx.fillRect(border, border, pilewt * pourcent / 100, pileht);

// met le pourcentage au centre après le fond
    ctx.font = "18px Bold";
    ctx.textAlign = "center";
    ctx.fillStyle = 'black';
    ctx.fillText(vtext, (pilewt - border) / 2 + border, (pileht) / 2 + 2 * border);

 }
}
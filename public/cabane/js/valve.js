/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global circ */

//  andre gagnon 1 mars 2018


var ROUGE = '#ff0000';
var VERT = '#00ff55';
var BLEU = '#709ed2';
var FILTRAT = '#00caca';
var CONCENTRE = '#679966';
var ROUGEPOMPE = '#cd0000';
var ORANGE = '#efa300';
var GRIS ='#d7d7d7'
var OPEN = 1;
var CLOSE = 0;
var PARTIEL = 2;
var FLIP = -1;
var ERREUR = 3
var MaxSecPompeOn = 3*60*1000 ; // 3 min en millisec
var MarioLaPolice = {family: 'Arial Black', size: 16 , fontWeight: 'bold'} ; //Arial Black
//Menlo, sans-serif
//  DEBUG
var AnimON = true ;
var DebugON = false ;

function Background(draw, x, y) {
    this.x = x || 0;
    this.y = y || 0;
    var image = draw.image('./schema.jpg');
}

var r = {};  //reservoir
var v = {};  //valve
var p = {};  //pompe
var u = {};  //vacUUm
var a = {};  //animation

function dessine(draw, myComposantes) {
    for (var key in myComposantes) {
        // for-in loop goes over all properties including inherited properties
        // let's use only our own properties
        //      if (myComposantes.hasOwnProperty(key)) {
        if (DebugON) console.log("key = " + key);
//            for ( var k in myComposantes[key]){
//                if (DebugOn) console.log( "attrib "+ k + " value = " + myComposantes[key][k]);
//            }
//        r[key]= draw.circle(myComposantes[key].dimx).fill(myComposantes[key].couleur).cx( myComposantes[key].x ).cy(myComposantes[key].y);

        switch (myComposantes[key].type) {
            case "R":
                r[key] = new Reservoir(draw, key, myComposantes[key].dimx, myComposantes[key].x,
                    myComposantes[key].y, myComposantes[key].couleur);
                break;
            case "V":
                v[key] = new Valve(draw, key, myComposantes[key].x, myComposantes[key].y,
                    myComposantes[key].couleur, myComposantes[key].etat, myComposantes[key].dimx,
                    myComposantes[key].dimy, myComposantes[key].anim);
                break;

            case "P":
                p[key] = new Pompe(draw, key, myComposantes[key].dimx, myComposantes[key].x,
                    myComposantes[key].y, myComposantes[key].couleur);
                break;
            case "U":
                u[key] = new Vacuum(draw, key, myComposantes[key].x,
                    myComposantes[key].y);
                break;
        }

    }
    // dessine une ligne pour essai

//    l1 = new Ligne(draw, 'V,>,566,208,10,148,#709ed2');
    //   var l2 = new Ligne('V,>,566,208,10,148,#709ed2') ;
//    l1.d();
    //   l2.d();
    //   l1.myplay();
    //  l2.myplay();

    // charge deux fois le fichier json
    //   chargelecture();
    chargelecture();

}


function testpourcent(ob) {
    r[ob].changepourcent(rndValue());

}

function testflip(ob) {
    v[ob].changeEtat(FLIP);

//    v['VaDF2'].changeEtat(OPEN);

}

function rndValue() {
    if (Math.random() > .5) {
        return Math.round(Math.random() * 100);
    } else {
        return (Math.random() * 100).toFixed(1);
    }
    ;
}


// Valve properties and method encapsulation
function Valve(draw, nom, x, y, couleur, etat, dimx, dimy, anim) {
//    this.nom = nom;
    this.x = x || 100;
    this.y = y || 100;
    this.couleur = couleur || VERT;
    this.etat = etat + 0 || OPEN;
    this.dimx = dimx || 10;
    this.dimy = dimy || 0;
    this.recx = 15;
    this.recy = 60;
    this.circ = this.recy / 2;
    this.anim = anim || "";
    if (dimx > dimy) {
        // horizontale on flip le rectangle
        var temp = this.recx;
        this.recx = this.recy;
        this.recy = temp;
    }
    this.b = draw.rect(63, 70).cx(this.x).cy(this.y).fill('#fff');  // rectangle blanc pour effacer

    this.r = draw.rect(this.recx, this.recy).fill(this.couleur).cx(this.x).cy(this.y);


    this.c = draw.circle(this.circ).fill(this.couleur).cx(this.x).cy(this.y);
    if (this.anim !== "" && AnimON) {
        a[nom] = new Ligne(draw, anim);
        a[nom].d();  // cree puis dessine
    };

    this.textNomValve = draw.plain(nom).cx(this.x).cy(this.y) - this.circ - 20;


/*
    this.d = function () {
        r = draw.rect(this.recx, this.recy).fill(this.couleur).cx(this.x).cy(this.y);
        c = draw.circle(this.circ).fill(this.couleur).cx(this.x).cy(this.y);

    };
 */
    this.changeCouleur = function (newc) {
        this.couleur = newc;
        //this.d();
        this.r.fill(this.couleur);
        this.c.fill(this.couleur);

    };
    this.changeEtat = function (textetat) {
        if (textetat === "Ouvert") etat = OPEN;
        if (textetat === "Fermé") etat = CLOSE;
        if (textetat === "Partiel") etat = PARTIEL;

        if (textetat === "Erreur" || textetat === "Partiel") {
            this.changeCouleur(ROUGE);
            etat = PARTIEL ;
        }


        if (etat == PARTIEL) {
            this.partiel();
            if (this.anim !== "" && AnimON) {
                a[nom].changeAnim(false);

            }
        }

        if (etat == OPEN) {
            this.changeCouleur(couleur);
            this.ouvre();
            if (this.anim !== "" && AnimON) {
                a[nom].changeAnim(true);
            }
        }
        if (etat == CLOSE) {
            this.changeCouleur(couleur); // on ne change pas la couleur
            this.ferme();
            if (this.anim !== "" && AnimON) {
                a[nom].changeAnim(false);
            }
        }
        this.etat = etat;
        //    }
    };
    this.ouvre = function () {
        this.r.animate().transform({rotation: 0}).cy(this.y).cx(this.x);
    };
    this.ferme = function () {
        this.r.animate().transform({rotation: -90}).cy(this.y).cx(this.x);
    };
    this.partiel = function () {
        this.r.animate().transform({rotation: -45}).cy(this.y).cx(this.x);
    };

    //   this.changeEtat("Fermé"); // par default on change l'etat pour close au depart


}

// Valve properties and method encapsulation
function Pompe(draw, nom, diam, x, y, couleur) {

    this.diam = diam || 100;
    this.x = x || 100;

    this.y = y || 100;
    this.couleur = GRIS ; // couleur || VERT;

    this.coulee = false;
    this.dateDepartPompe = undefined ; //new Date();
    this.gallons = 0;
    this.gph = 0;



    this.textP = draw.plain("test").cx(this.x).cy(this.y);
    this.textP.build(false);
    this.textP2 = draw.plain("test").cx(this.x).cy(this.y);
    this.textP2.build(false);
    this.textP3 = draw.plain("test").cx(this.x).cy(this.y);
    this.textP3.build(false);

    this.cblanc = draw.circle(this.diam).cx(this.x).cy(this.y).fill('#fff');
    this.c = draw.circle(this.diam).fill(this.couleur).opacity(0.3).cx(this.x).cy(this.y).stroke({
        color: this.couleur,
        width: 5,
        opacity: 0.8
    });
    this.textnomPompe = draw.plain(nom).font(MarioLaPolice) //  {family: 'Helvetica', size: 20})
        .cx(this.x - this.diam * 0.6)
        .cy(this.y - this.diam * 0.6);
/*    this.textnomValve.click(function () {
        testpourcent(nom);
    });
    */
/*
    this.d = function () {
        this.c = draw.circle(this.diam).fill(this.couleur).cx(this.x).cy(this.y).opacity(0.2);
    };

*/    this.changeState = function (state,capacity,duty,volume) {
        var op = 0;
        if (state === false) {
            op = 1;
            this.c.fill(GRIS);
            this.dateDepartPompe = undefined ;      //reset le compteur
        }
        if (state === true) {
            if (!this.dateDepartPompe) {
                this.dateDepartPompe = Date.now();
                this.c.fill(VERT);      // pompe on vert ok
                if (DebugON) console.log("pompe " + nom + " démarré");
            }
            else{
                if ((Date.now() - this.dateDepartPompe) > MaxSecPompeOn && volume){  // hack pour ne pas toucher au vaccum
                    this.c.fill(ORANGE);
                    op = 3;
                    if (DebugON) console.log("pompe "+nom + " dépasse la durée");
                }
            }
            op = 1;
         //

        }
        var toffset = -20;
        if (volume) {  // hack pas elegant pour pompe a vide  ... pas de texte  pas de volume  ...
            this.textP.clear();
            this.textP = draw.plain((duty * 100).toFixed(0) + "%").cx(this.x).cy(this.y + toffset).font(MarioLaPolice);
            this.textP2.clear();
            this.textP2 = draw.plain((capacity * duty).toFixed(0) + " g/h").cx(this.x).cy(this.y + toffset + 20).font(MarioLaPolice);
//        if (contient > 0)
            this.textP3.clear();
            this.textP3 = draw.plain(volume.toFixed(0) + " g").cx(this.x).cy(this.y + toffset + 40).font(MarioLaPolice);
//        this.textP.text(parseInt(this.pourcent, 10) + "%").move(this.x,(this.y + toffset));
        }
        this.c.opacity(op);

    };


}

function Vacuum(draw, nom, x, y, valeur) {


    this.x = x || 100;

    this.y = y || 100;
    this.valeur = valeur || 0;


//    this.textV = draw.text(this.valeur+" in").cx(this.x).cy(this.y);
    this.textV = draw.text(this.valeur + " in").move(this.x - 30, this.y).font(MarioLaPolice);
    this.textV.build(false);

//    this.textnom.click(function () {
//        testpourcent(nom);
//    });


    this.changeValeur = function (valeur) {
        this.textV.clear();
        this.textV = draw.text(valeur + " in").move(this.x - 30, this.y - 10).font(MarioLaPolice);
        this.textV.opacity(1);

    };


}


function Ligne(draw, anim) {
    var re = /\s*,\s*/;
    var s = anim.split(re);
    var vh = s[0];
    var sens = s[1];
    var x = s[2];
    var y = s[3];
    var rx = s[4];
    var longeur = s[5];
    var couleur = s[6];
    this.circ = {};
    this.d = function () {

        if (vh === 'H') {
            //       var line = draw.line(0, longeur, longeur, longeur).move(x, y);
            //       line.stroke({color: BLEU, width: rx, linecap: 'round', opacity: '0.4'});
            if (sens === '>') {
                this.circ = draw.circle(rx).move(x - rx / 2, y - rx / 2).fill(couleur);
                this.circ.animate({ease: sens, delay: '3.5s'}).attr({fill: couleur}).animate().dmove(longeur, 0).loop();
                this.circ.pause();
            } else {
                this.circ = draw.circle(rx).move(longeur + x - rx / 2, y - rx / 2).fill(couleur);
                this.circ.animate({
                    ease: sens,
                    delay: '3.5s'
                }).attr({fill: 'couleur'}).animate().dmove(-longeur, 0).loop();
                this.circ.pause();
            }
        } else {
//        var line = draw.line(0, 0, 0, longeur).move(x, y);
//        line.stroke({color: BLEU, width: rx, linecap: 'round', opacity: '0.4'});
            if (sens === '>') {
                this.circ = draw.circle(rx).move(x - rx / 2, y - rx / 2).fill(couleur);
                this.circ.animate({ease: sens, delay: '3.5s'}).attr({fill: couleur}).animate().dmove(0, longeur).loop();
                this.circ.pause();
            } else {
                this.circ = draw.circle(rx).move(x - rx / 2, longeur + y - rx / 2).fill(couleur);
                this.circ.animate({
                    ease: sens,
                    delay: '3.5s'
                }).attr({fill: couleur}).animate().dmove(0, -longeur).loop();
                this.circ.pause();
            }
        }
        ;
    };

    this.mypause = function () {
        this.circ.pause();
    };
    this.myplay = function () {
        this.circ.play();
    };
    this.changeAnim = function (state) {
        var op = 0;
        if (state === false) {
            this.mypause();
        }
        if (state === true) {
            this.myplay();
        }

    };
}


function Reservoir(draw, nom, diam, x, y, couleur) {

    this.diam = diam || 100;
    this.x = x || 100;
    this.y = y || 100;
    this.couleur = couleur || GRIS;
    var dvide = [
        "M", x, y,
        "h", 10,
        "v", 10
    ].join(" ");
    var strokeWidth = 7.5 ; // cercle exterieur
    this.p = draw.path(dvide).fill({color: this.couleur, opacity: 0.8});
    // stroke({color: couleur, width: 5, opacity: 0.8});
    this.textP = draw.text("test").move(this.x, this.y);
    this.textP.build(false);
    this.textP2 = draw.text("test").move(this.x, this.y + 15);
    this.textP2.build(false);
    this.cblanc = draw.circle(this.diam).cx(this.x).cy(this.y).fill('#fff');
    this.c = draw.circle(this.diam).fill(this.couleur).opacity(0.3).cx(this.x).cy(this.y).stroke({
        color: this.couleur , //this.couleur,
        width: strokeWidth,
        opacity: 1
    });

    this.textnom = draw.plain(nom).font(MarioLaPolice)
        .cx(this.x - this.diam * 0.6)
        .cy(this.y - this.diam * 0.6);
    this.textnom.click(function () {
        testpourcent(nom);
    });
    /*
    this.d = function () {
        this.c = draw.circle(this.diam).fill(this.couleur).cx(this.x).cy(this.y).opacity(0.4).stroke({
            color: this.couleur, //this.couleur,
            width: strokeWidth,
            opacity: 1
           });
    };
*/
    this.changeCouleur = function (newc) {
        this.couleur = newc;
        //this.d();
        this.r.fill(this.couleur);
        this.c.fill(this.couleur);
    };
    this.changePoutour= function(pourcent){
        mynewcolor = this.couleur ; // reservoir par default
        if (pourcent >= 75 && pourcent < 90){
            mynewcolor=VERT;
        };
        if (pourcent >= 90){
            mynewcolor = ROUGE;
        };
      this.c.opacity(0);
      this.c = draw.circle(this.diam).fill({color:this.couleur,opacity:0.4}).cx(this.x).cy(this.y).stroke({
            color: mynewcolor , //this.couleur,
            width: strokeWidth,
            opacity: 1
        });
//    return(mynewcolor);
    };
    this.changepourcent = function (pourcent, contient) {
        this.p.opacity(0); // efface le vieux
        this.textP.opacity(0); // =  draw.plain( " ");
        this.textP2.opacity(0); // =  draw.plain( " ");
        this.pourcent = pourcent;
        this.changePoutour(this.pourcent);

        var arc = pourcentToArc(this.pourcent);
        var desc = describeArc(this.x, this.y, (this.diam-strokeWidth) / 2, 180 - arc / 2.0, 180 + arc / 2.0);
        //  var offset = parseFloat(desc.split(' ')[10])/2;
        //   if (DebugON) console.log( offset + " " +pourcent+ " pourcent " + describeArc(this.diam/2, this.diam/2, this.diam/2, 180-arc/2.0, 180+arc/2.0));


        this.p = draw.path(desc).fill({color: this.couleur, opacity: 0.8});
        //  ;  p.cx(this.x).cy(this.y+offset);
        //    p.animate({ ease: '<>', delay: '2s' });
        //   path.fill(ROUGE);
        // ///path.cx(this.x);
        // ///path.cy(this.y+offset);
        var toffset = this.pourcent > 50 ? 10 : -25;
        this.textP = draw.plain(parseInt(this.pourcent, 10) + "%").cx(this.x).cy(this.y + toffset).font(MarioLaPolice);
        if (contient > 0) this.textP2 = draw.plain( contient).cx(this.x).cy(this.y + toffset + 15 ).font(MarioLaPolice);
//        this.textP.text(parseInt(this.pourcent, 10) + "%").move(this.x,(this.y + toffset));


    };
}


function pourcentToArc(p) {

    var adepart = 180;
    var pdepart = 50; // 50%Math.PI/2.0; // 180.0;
    var a100 = Math.PI;
    var dmin, dmax, d, oldd, np;
    var c = 1;
    var precision = 1.0;
    if (p < 50) {
        dmin = 0.0;
        dmax = 180.0;
        d = 135.0;
    } else {
        dmin = 180.0;
        dmax = 360.0;
        d = 225.0;
    }
    oldd = d;
    do {

        np = calculAirePC(d);
        //           if (DebugOn) console.log("count "+ c + " np " + np + " p " + p + " d " +  d);
        c++;
        if (np > p) {
            dmax = d;
        } else {
            dmin = d;
        }
        oldd = d;
        d = dmin + (dmax - dmin) / 2.0;
    } while (Math.abs(np - p) > precision);
    return (oldd);
}

function calculAirePC(a) {
    var ar = degToRad(a);
    var rep = ((0.5 * (ar - Math.sin(ar))) / Math.PI) * 100.0;
    return (rep);
}

function degToRad(d) {
    return (d * Math.PI / 180.0);
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}

function describeArc(x, y, radius, startAngle, endAngle) {

    var start = polarToCartesian(x, y, radius, endAngle);
    var end = polarToCartesian(x, y, radius, startAngle);
    var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    var d = [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
    return d;
}



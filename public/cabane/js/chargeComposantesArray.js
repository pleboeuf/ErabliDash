/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var ROUGE = '#ff0000';
var VERT = '#00ff55';
var BLEU = '#709ed2';
var OPEN = 1;
var CLOSE = 0;

function Composante(type, x, y, dimx, dimy, couleur, etat,anim) {
    this.type = type || undefined;
    this.x = x || 100;
    this.y = y || 100;
    this.dimx = dimx || 100;
    this.dimy = dimy || 0;
    this.couleur = couleur || VERT;
    this.etat = etat || CLOSE;
    this.anim = anim || "";

}


function demarre(draw) {
    var myComposantes = {}; // tableau non definie pour charger x composantes ... grossit en temp reel

    var url = 'https://spreadsheets.google.com/feeds/list/1WgLJMCOjQ_m01eUty0JUDH9OKJUVHZZswqJsyJ2ddyo/1/public/values?alt=json';

    //  https://docs.google.com/spreadsheets/d/1X7d6uTxtTJn65NtlnAHRkvABndyiamiTd-MATEgGaJ0/edit?usp=sharing
    // https://docs.google.com/spreadsheets/d/1X7d6uTxtTJn65NtlnAHRkvABndyiamiTd-MATEgGaJ0/edit?usp=sharing
    var output = "";
    //   $.getJSON(url, cellEntries);
    $.getJSON(url, function (data) {

        $.each(data.feed.entry, function (index, value) {

            myComposantes[value.gsx$composante.$t] =  new Composante(value.gsx$type.$t,myNumber(value.gsx$x.$t), myNumber(value.gsx$y.$t),
                    myNumber(value.gsx$dimx.$t), myNumber(value.gsx$dimy.$t), value.gsx$couleur.$t,
                    value.gsx$etat.$t,value.gsx$animation.$t);



        });
 

        dessine(draw, myComposantes);

    }
    );

    if (DebugON) console.log("output dans demarre " + output);
    return(output);
}
function myNumber(n) {  // enleve les espaces et change les , en .  les chiffres dans les spreadsheet google
    var rep = n.replace(/ /g, "");
    rep = rep.replace(/,/g, ".");
    return Number(rep);
}



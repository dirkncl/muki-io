function HideShow(divToProcess,buttonId,Txtshow,Txthide) {
  var div = document.getElementById(divToProcess);
  if (div.style.display !== "none") {
    div.style.display = "none";
    document.getElementById(buttonId).innerHTML=Txtshow;
  }
  else {
     div.style.display = "block";
     document.getElementById(buttonId).innerHTML=Txthide;
  }
};/*
function showhide(){
  var div = document.getElementById("player");
  if (div.style.display !== "none") {
    div.style.display = "none";
  }
  else {
    div.style.display = "block";
  }
}*/


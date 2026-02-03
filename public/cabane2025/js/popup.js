/**
 * http://usejsdoc.org/
 */
function popup(oper){
	

$(".trigger_popup_fricc").click(function(){
       $('.hover_bkgr_fricc').show();
    });
    $('.hover_bkgr_fricc').click(function(){
        $('.hover_bkgr_fricc').hide();
    });
    $('.popupCloseButton').click(function(){
        $('.hover_bkgr_fricc').hide();
    });
    
    switch (oper) {
    case  'show':
    	$('.hover_bkgr_fricc').show();
    case   'hide':
		$('.hover_bkgr_fricc').hide();	
    }

}
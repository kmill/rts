/**
 * @author mrdoob / http://mrdoob.com/
 */

var WebsocketStats = function () {

	var startTime = Date.now(), prevTime = startTime, lastTime = startTime;
  var prevTimeS = startTime;
	var ms = 0, msMin = Infinity, msMax = 0;
	var kpsR = 0, kpsRMin = Infinity, kpsRMax = 0;
	var kpsS = 0, kpsSMin = Infinity, kpsSMax = 0;
	var bytesR = 0, bytesS = 0, mode = 0;

	var container = document.createElement( 'div' );
	container.id = 'stats';
	container.addEventListener( 'mousedown', function ( event ) { event.preventDefault(); setMode( ++ mode % 3 ) }, false );
	container.style.cssText = 'width:80px;opacity:0.9;cursor:pointer';

	var kpsRDiv = document.createElement( 'div' );
	kpsRDiv.id = 'kpsR';
	kpsRDiv.style.cssText = 'padding:0 0 3px 3px;text-align:left;background-color:#002';
	container.appendChild( kpsRDiv );

	var kpsRText = document.createElement( 'div' );
	kpsRText.id = 'kpsRText';
	kpsRText.style.cssText = 'color:#0ff;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px';
	kpsRText.innerHTML = 'kB/S';
	kpsRDiv.appendChild( kpsRText );

	var kpsRGraph = document.createElement( 'div' );
	kpsRGraph.id = 'kpsRGraph';
	kpsRGraph.style.cssText = 'position:relative;width:74px;height:30px;background-color:#0ff';
	kpsRDiv.appendChild( kpsRGraph );

	while ( kpsRGraph.children.length < 74 ) {

		var bar = document.createElement( 'span' );
		bar.style.cssText = 'width:1px;height:30px;float:left;background-color:#113';
		kpsRGraph.appendChild( bar );

	}

	var kpsSDiv = document.createElement( 'div' );
	kpsSDiv.id = 'kpsS';
	kpsSDiv.style.cssText = 'padding:0 0 3px 3px;text-align:left;background-color:#020;display:none';
	container.appendChild( kpsSDiv );

	var kpsSText = document.createElement( 'div' );
	kpsSText.id = 'kpsSText';
	kpsSText.style.cssText = 'color:#0ff;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px';
	kpsSText.innerHTML = 'kB/S sent';
	kpsSDiv.appendChild( kpsSText );

	var kpsSGraph = document.createElement( 'div' );
	kpsSGraph.id = 'kpsSGraph';
	kpsSGraph.style.cssText = 'position:relative;width:74px;height:30px;background-color:#ff0';
	kpsSDiv.appendChild( kpsSGraph );

	while ( kpsSGraph.children.length < 74 ) {

		var bar = document.createElement( 'span' );
		bar.style.cssText = 'width:1px;height:30px;float:left;background-color:#311';
		kpsSGraph.appendChild( bar );

	}

	var msDiv = document.createElement( 'div' );
	msDiv.id = 'ms';
	msDiv.style.cssText = 'padding:0 0 3px 3px;text-align:left;background-color:#020;display:none';
	container.appendChild( msDiv );

	var msText = document.createElement( 'div' );
	msText.id = 'msText';
	msText.style.cssText = 'color:#0f0;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px';
	msText.innerHTML = 'MS';
	msDiv.appendChild( msText );

	var msGraph = document.createElement( 'div' );
	msGraph.id = 'msGraph';
	msGraph.style.cssText = 'position:relative;width:74px;height:30px;background-color:#0f0';
	msDiv.appendChild( msGraph );

	while ( msGraph.children.length < 74 ) {

		var bar = document.createElement( 'span' );
		bar.style.cssText = 'width:1px;height:30px;float:left;background-color:#131';
		msGraph.appendChild( bar );

	}

	var setMode = function ( value ) {

		mode = value;

		switch ( mode ) {

			case 0:
				kpsRDiv.style.display = 'block';
				kpsSDiv.style.display = 'none';
				msDiv.style.display = 'none';
				break;
			case 1:
			  kpsRDiv.style.display = 'none';
  			kpsSDiv.style.display = 'block';
				msDiv.style.display = 'none';
				break;
      case 2:
  			kpsRDiv.style.display = 'none';
  			kpsSDiv.style.display = 'none';
				msDiv.style.display = 'block';
				break;
		}

	};

	var updateGraph = function ( dom, value ) {

		var child = dom.appendChild( dom.firstChild );
		child.style.height = value + 'px';

	};

  function background_update() {
    if (Date.now() - lastTime > 1000) {
      lastTime = Date.now();
      o.record(0);
      o.recordSend(0);
    }
  }
  window.setInterval(background_update, 1000);

	var o = {

		REVISION: 11.5,

		domElement: container,

		setMode: setMode,

		record: function (num_bytes) {

			var time = Date.now();

			ms = time - lastTime;
			msMin = Math.min( msMin, ms );
			msMax = Math.max( msMax, ms );

			msText.textContent = ms + ' MS (' + msMin + '-' + msMax + ')';
			updateGraph( msGraph, Math.min( 30, 30 - ( ms / 200 ) * 30 ) );

			bytesR += num_bytes;

			if ( time > prevTime + 1000 ) {

				kpsR = +( ( bytesR ) / ( time - prevTime ) ).toFixed(2);
				kpsRMin = Math.min( kpsRMin, kpsR );
				kpsRMax = Math.max( kpsRMax, kpsR );

				kpsRText.textContent = kpsR + ' kB/s'; // (' + kpsMin + '-' + kpsMax + ')';
				updateGraph( kpsRGraph, Math.min( 30, 30 - ( kpsR / 25 ) * 30 ) );

				prevTime = time;
				bytesR = 0;

			}
      lastTime = time;

			return time;

		},

		recordSend: function (num_bytes) {
			var time = Date.now();


			bytesS += num_bytes;

			if ( time > prevTimeS + 1000 ) {

				kpsS = +( ( bytesS ) / ( time - prevTimeS ) ).toFixed(2);
				kpsSMin = Math.min( kpsSMin, kpsS );
				kpsSMax = Math.max( kpsSMax, kpsS );

				kpsSText.textContent = kpsS + ' kB/s sent'; // (' + kpsMin + '-' + kpsMax + ')';
				updateGraph( kpsSGraph, Math.min( 30, 30 - ( kpsS / 25 ) * 30 ) );

				prevTimeS = time;
				bytesS = 0;

			}

			return time;

		},


		update: function () {

			startTime = this.end();

		}

	};
  return o;

};

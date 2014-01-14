/**
 * @author mrdoob / http://mrdoob.com/
 */

var WebsocketStats = function () {

	var startTime = Date.now(), prevTime = startTime, lastTime = startTime;
	var ms = 0, msMin = Infinity, msMax = 0;
	var kps = 0, kpsMin = Infinity, kpsMax = 0;
	var bytes = 0, mode = 0;

	var container = document.createElement( 'div' );
	container.id = 'stats';
	container.addEventListener( 'mousedown', function ( event ) { event.preventDefault(); setMode( ++ mode % 2 ) }, false );
	container.style.cssText = 'width:80px;opacity:0.9;cursor:pointer';

	var kpsDiv = document.createElement( 'div' );
	kpsDiv.id = 'kps';
	kpsDiv.style.cssText = 'padding:0 0 3px 3px;text-align:left;background-color:#002';
	container.appendChild( kpsDiv );

	var kpsText = document.createElement( 'div' );
	kpsText.id = 'kpsText';
	kpsText.style.cssText = 'color:#0ff;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px';
	kpsText.innerHTML = 'kB/S';
	kpsDiv.appendChild( kpsText );

	var kpsGraph = document.createElement( 'div' );
	kpsGraph.id = 'kpsGraph';
	kpsGraph.style.cssText = 'position:relative;width:74px;height:30px;background-color:#0ff';
	kpsDiv.appendChild( kpsGraph );

	while ( kpsGraph.children.length < 74 ) {

		var bar = document.createElement( 'span' );
		bar.style.cssText = 'width:1px;height:30px;float:left;background-color:#113';
		kpsGraph.appendChild( bar );

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
				kpsDiv.style.display = 'block';
				msDiv.style.display = 'none';
				break;
			case 1:
  			kpsDiv.style.display = 'none';
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

			bytes += num_bytes;

			if ( time > prevTime + 1000 ) {

				kps = +( ( bytes ) / ( time - prevTime ) ).toFixed(2);
				kpsMin = Math.min( kpsMin, kps );
				kpsMax = Math.max( kpsMax, kps );

				kpsText.textContent = kps + ' kB/s'; // (' + kpsMin + '-' + kpsMax + ')';
				updateGraph( kpsGraph, Math.min( 30, 30 - ( kps / 25 ) * 30 ) );

				prevTime = time;
				bytes = 0;

			}
      lastTime = time;

			return time;

		},

		update: function () {

			startTime = this.end();

		}

	};
  return o;

};

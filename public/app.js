document.addEventListener('DOMContentLoaded', () => {
    const userGrid = document.querySelector('.grid-user');
    const opponentGrid = document.querySelector('.grid-opponent');
    const availableShipsGrid = document.querySelector('.grid-available-ships');
    const ships = document.querySelectorAll('.ship');
    const singleMasted = document.querySelectorAll('.single-masted-container');
    const doubleMasted = document.querySelectorAll('.double-masted-container');
    const threeMasted = document.querySelectorAll('.three-masted-container');
    const fourMasted = document.querySelectorAll('.four-masted-container');
    const startButton = document.querySelector('#start');
    const rotateButton = document.querySelector('#rotate');
    const whoseTurn = document.querySelector('#whose-turn');
    const info = document.querySelector('#info');
    const over = document.querySelector('#gameOver');
    const winner = document.querySelector('#winner');
    let isHorizontal = true;
    let isGameOver = false;
    let currentPlayer = 'user'
    const userSquares = [];
    const opponentSquares = [];
    const width = 10;

    let playerNumber = 0;
    let ready = false;
    let opponentReady = false;
    let allShipsPlaced = false;
    let shotFired = -1;
    const socket = io();

    socket.on('player-number', num => {
        if (num === -1) {
            info.innerHTML = 'Sorry, server is full';
        } else {
            playerNumber = parseInt(num);
            if (playerNumber === 1) currentPlayer = 'opponent';
        }
        socket.emit('check-players');
    });

    socket.on('enemy-ready', num => {
        opponentReady = true;
        playerRaady(num);
        if (ready) playGame(socket);
    })

    socket.on('check-players', players => {
        players.forEach((p, i) => {
            if (p.connected) playerConnectedOrDisconnected(i);
            if (p.ready) {
                playerRaady(i);
                if (i !== playerRaady) opponentReady = true;
            }
        });
    });

    socket.on('player-connection', num => {
        playerConnectedOrDisconnected(num);
    });

    socket.on('fire', id => {
        opponentTurn(id);
        const square = userSquares[id];
        socket.emit('fire-reply', square.classList);
        playGame(socket);
    });

    socket.on('fire-reply', classList => {
        revealSquare(classList);
        playGame(socket);
    });

    const playerConnectedOrDisconnected = num => {
        let player = `.p${parseInt(num) + 1}`;
        document.querySelector(`${player} .connected span`).classList.toggle('green');
        if(parseInt(num) === playerNumber) document.querySelector(player).style.fontWeight = 'bold';
    }

    startButton.addEventListener('click', () => {
        if(allShipsPlaced) playGame(socket);
        else info.innerHTML = 'Please place all ships';
    });


    const createBoard = (grid, squares, width) => {
        for (let i = 0; i < width*width; i++) {
            const square = document.createElement('div');
            square.dataset.id = i;
            grid.appendChild(square);
            squares.push(square);
        }
    }

    createBoard(userGrid, userSquares, width);
    createBoard(opponentGrid, opponentSquares, width);

    opponentSquares.forEach(square => {
        square.addEventListener('click', () => {
            if (currentPlayer === 'user' && ready && opponentReady) {
                shotFired = square.dataset.id;
                socket.emit('fire', shotFired);
            }
        });
    });
    
    // ships rotation
    const rotateShips = () => {
        doubleMasted.forEach(ship => ship.classList.toggle('double-masted-container-vertical'));
        threeMasted.forEach(ship => ship.classList.toggle('three-masted-container-vertical'));
        fourMasted.forEach(ship => ship.classList.toggle('four-masted-container-vertical'));
        isHorizontal = isHorizontal ? false : true;
    }

    rotateButton.addEventListener('click', rotateShips);

    // moving ships
    let selectedShipIndex;
    let draggedShip;
    let draggedShipLength;

    const dragStart = element => {
        draggedShip = element;
        draggedShipLength = draggedShip.childNodes.length;
    }
    const dragOver = e => e.preventDefault();
    const dragEnter = e => e.preventDefault();
    const dragLeave = () => {}
    const dragDrop = element => {
        let shipNameLastId = draggedShip.lastChild.id;
        let shipClass = shipNameLastId.slice(0, -2);
        let lastShipIndex = parseInt(shipNameLastId.substr(-1));
        let shipLastId = lastShipIndex + parseInt(element.dataset.id);
        selectedShipIndex = parseInt(selectedShipIndex.substr(-1));
        shipLastId = isHorizontal ? shipLastId - selectedShipIndex : shipLastId - selectedShipIndex + (draggedShipLength-selectedShipIndex-1)*width-(draggedShipLength-selectedShipIndex-1);
        const possibleHorizontal = () => {
            if (shipLastId - draggedShipLength + 1 < 0) return false;
            if ((shipLastId - draggedShipLength + 1) % width > shipLastId % width) return false
            return true;
        };
        const possibleVertical = () => {
            if (shipLastId > 99) return false;
            if (shipLastId - draggedShipLength*width < 0) return false;
            return true;
        };
        if (isHorizontal && possibleHorizontal()) {
            for (let i=0; i < draggedShipLength; i++) {
              let directionClass;
              if (i === 0) directionClass = 'start';
              if (i === draggedShipLength - 1) directionClass = 'end';
              userSquares[parseInt(element.dataset.id) - selectedShipIndex + i].classList.add('taken', 'horizontal', directionClass, shipClass);
            }
          } else if (!isHorizontal && possibleVertical()) {
            for (let i=0; i < draggedShipLength; i++) {
              let directionClass;
              if (i === 0) directionClass = 'start';
              if (i === draggedShipLength - 1) directionClass = 'end';
              userSquares[parseInt(element.dataset.id) - selectedShipIndex*width + width*i].classList.add('taken', 'vertical', directionClass, shipClass);
            }
          } else return;
        
        availableShipsGrid.removeChild(draggedShip);
        if (!availableShipsGrid.querySelector('.ship')) allShipsPlaced = true;
     }

    const dragEnd = () => {}

    ships.forEach(ship => ship.addEventListener('dragstart', () => dragStart(ship)));
    userSquares.forEach(square => square.addEventListener('dragstart', dragStart));
    userSquares.forEach(square => square.addEventListener('dragover', dragOver));
    userSquares.forEach(square => square.addEventListener('dragenter', dragEnter));
    userSquares.forEach(square => square.addEventListener('dragleave', dragLeave));
    userSquares.forEach(square => square.addEventListener('drop', () => dragDrop(square)));
    userSquares.forEach(square => square.addEventListener('dragend', dragEnd));
    ships.forEach(ship => ship.addEventListener('mousedown', e => {
        selectedShipIndex = e.target.id;
    }));

    let singleMasted0Count = 0;
    let singleMasted1Count = 0;
    let singleMasted2Count = 0;
    let singleMasted3Count = 0;
    let doubleMasted0Count = 0;
    let doubleMasted1Count = 0;
    let doubleMasted2Count = 0;
    let threeMasted0Count = 0;
    let threeMasted1Count = 0;
    let fourMasted0Count = 0;

    const revealSquare = classList => {
        const opponentSquare = opponentGrid.querySelector(`div[data-id='${shotFired}']`);
        const obj = Object.values(classList);
        if (!opponentSquare.classList.contains('hit') && currentPlayer === 'user' && !isGameOver) {
            if (obj.includes('single-masted-0')) singleMasted0Count++;
            if (obj.includes('single-masted-1')) singleMasted1Count++;
            if (obj.includes('single-masted-2')) singleMasted2Count++;
            if (obj.includes('single-masted-3')) singleMasted3Count++;
            if (obj.includes('double-masted-0')) doubleMasted0Count++;
            if (obj.includes('double-masted-1')) doubleMasted1Count++;
            if (obj.includes('double-masted-2')) doubleMasted2Count++;
            if (obj.includes('three-masted-0')) threeMasted0Count++;
            if (obj.includes('three-masted-1')) threeMasted1Count++;
            if (obj.includes('four-masted-0')) fourMasted0Count++;
            if (obj.includes('taken')) opponentSquare.classList.add('hit');
            else opponentSquare.classList.add('miss');
            
            checkWin();
            currentPlayer = 'opponent';
            playGame();
        }                
    }

    const playGame = socket => {
        if (isGameOver) return;
        if (!ready) {
            socket.emit('player-ready');
            ready = true;
            playerRaady(playerNumber);
        }
        if (opponentReady) {
            if (info.innerHTML === 'Waiting for second player...' || info.innerHTML === 'Please place all ships') info.innerHTML = ''
            if (currentPlayer === 'user') {
                whoseTurn.innerHTML = 'Your turn';
            }
            if (currentPlayer === 'opponent') {
                whoseTurn.innerHTML = 'Opponent turn';
            }
        }
        if (!opponentReady) {
            info.innerHTML = 'Waiting for second player...';
        }
    }

    const playerRaady = num => {
        let player = `.p${parseInt(num) + 1}`
        document.querySelector(`${player} .ready span`).classList.toggle('green');
    }

    var checkWin = () => {
        if (singleMasted0Count === 1) {
            info.innerHTML = 'You sunk the enenmy single mast!'
            singleMasted0Count = 10;
        }
        if (singleMasted1Count === 1) {
            info.innerHTML = 'You sunk the enenmy single mast!'
            singleMasted1Count = 10;
        }
        if (singleMasted2Count === 1) {
            info.innerHTML = 'You sunk the enenmy single mast!'
            singleMasted2Count = 10;
        }
        if (singleMasted3Count === 1) {
            info.innerHTML = 'You sunk the enenmy single mast!'
            singleMasted3Count = 10;
        }
        if (doubleMasted0Count === 2) {
            info.innerHTML = 'You sunk the enenmy double mast!'
            doubleMasted0Count = 10;
        }
        if (doubleMasted1Count === 2) {
            info.innerHTML = 'You sunk the enenmy double mast!'
            doubleMasted1Count = 10;
        }
        if (doubleMasted2Count === 2) {
            info.innerHTML = 'You sunk the enenmy double mast!'
            doubleMasted2Count = 10;
        }
        if (threeMasted0Count === 3) {
            info.innerHTML = 'You sunk the enenmy three mast!'
            threeMasted0Count = 10;
        }
        if (threeMasted1Count === 3) {
            info.innerHTML = 'You sunk the enenmy three mast!'
            threeMasted1Count = 10;
        }
        if (fourMasted0Count === 4) {
            info.innerHTML = 'You sunk the enenmy four mast!'
            fourMasted0Count = 10;
        }
        if (singleMasted0CountOpponent === 1) {
            info.innerHTML = 'Enemy sunk your single mast!'
            singleMasted0CountOpponent = 10;
        }
        if (singleMasted1CountOpponent === 1) {
            info.innerHTML = 'Enemy sunk your single mast!'
            singleMasted1CountOpponent = 10;
        }
        if (singleMasted2CountOpponent === 1) {
            info.innerHTML = 'Enemy sunk your single mast!'
            singleMasted2CountOpponent = 10;
        }
        if (singleMasted3CountOpponent === 1) {
            info.innerHTML = 'Enemy sunk your single mast!'
            singleMasted3CountOpponent = 10;
        }
        if (doubleMasted0CountOpponent === 2) {
            info.innerHTML = 'Enemy sunk your double mast!'
            doubleMasted0CountOpponent = 10;
        }
        if (doubleMasted1CountOpponent === 2) {
            info.innerHTML = 'Enemy sunk your double mast!'
            doubleMasted1CountOpponent = 10;
        }
        if (doubleMasted2CountOpponent === 2) {
            info.innerHTML = 'Enemy sunk your double mast!'
            doubleMasted2CountOpponent = 10;
        }
        if (threeMasted0CountOpponent === 3) {
            info.innerHTML = 'Enemy sunk your three mast!'
            threeMasted0CountOpponent = 10;
        }
        if (threeMasted1CountOpponent === 3) {
            info.innerHTML = 'Enemy sunk your three mast!'
            threeMasted1CountOpponent = 10;
        }
        if (fourMasted0CountOpponent === 4) {
            info.innerHTML = 'Enemy sunk your four mast!'
            fourMasted0CountOpponent = 10;
        }
        console.log(singleMasted0Count + singleMasted1Count + singleMasted2Count + singleMasted3Count + doubleMasted0Count + doubleMasted1Count + doubleMasted2Count + threeMasted0Count + threeMasted1Count + fourMasted0Count)
        if ((singleMasted0Count + singleMasted1Count + singleMasted2Count + singleMasted3Count + doubleMasted0Count + doubleMasted1Count + doubleMasted2Count + threeMasted0Count + threeMasted1Count + fourMasted0Count) > 99) {
            info.innerHTML = 'You win!';
            isGameOver = true;
            gameOver(true);
        }
        console.log(singleMasted0CountOpponent + singleMasted1CountOpponent + singleMasted2CountOpponent + singleMasted3CountOpponent + doubleMasted0CountOpponent + doubleMasted1CountOpponent + doubleMasted2CountOpponent + threeMasted0CountOpponent + threeMasted1CountOpponent + fourMasted0CountOpponent)
        if ((singleMasted0CountOpponent + singleMasted1CountOpponent + singleMasted2CountOpponent + singleMasted3CountOpponent + doubleMasted0CountOpponent + doubleMasted1CountOpponent + doubleMasted2CountOpponent + threeMasted0CountOpponent + threeMasted1CountOpponent + fourMasted0CountOpponent) > 99) {
            info.innerHTML = 'Enemy win!';
            isGameOver = true;
            gameOver(false);
        }
    }

    const gameOver = win => {
        socket.emit('disconnect-client');
        over.style.display = 'block';
        if (win) {
            winner.innerHTML = 'YOU WIN!';
            over.classList.add('win');
        } else {
            winner.innerHTML = 'YOU LOOSE!';
            over.classList.add('loose');
        }
    } 

    let singleMasted0CountOpponent = 0;
    let singleMasted1CountOpponent = 0;
    let singleMasted2CountOpponent = 0;
    let singleMasted3CountOpponent = 0;
    let doubleMasted0CountOpponent = 0;
    let doubleMasted1CountOpponent = 0;
    let doubleMasted2CountOpponent = 0;
    let threeMasted0CountOpponent = 0;
    let threeMasted1CountOpponent = 0;
    let fourMasted0CountOpponent = 0;

    const opponentTurn = square => {
        if (!userSquares[square].classList.contains('hit')) {
            if (userSquares[square].classList.contains('single-masted-0')) singleMasted0CountOpponent++;
            if (userSquares[square].classList.contains('single-masted-1')) singleMasted1CountOpponent++;
            if (userSquares[square].classList.contains('single-masted-2')) singleMasted2CountOpponent++;
            if (userSquares[square].classList.contains('single-masted-3')) singleMasted3CountOpponent++;
            if (userSquares[square].classList.contains('double-masted-0')) doubleMasted0CountOpponent++;
            if (userSquares[square].classList.contains('double-masted-1')) doubleMasted1CountOpponent++;
            if (userSquares[square].classList.contains('double-masted-2')) doubleMasted2CountOpponent++;
            if (userSquares[square].classList.contains('three-masted-0')) threeMasted0CountOpponent++;
            if (userSquares[square].classList.contains('three-masted-1')) threeMasted1CountOpponent++;
            if (userSquares[square].classList.contains('four-masted-0')) fourMasted0CountOpponent++;
    
            if (userSquares[square].classList.contains('taken')) userSquares[square].classList.add('hit');
            else userSquares[square].classList.add('miss');

            currentPlayer = 'user';
            checkWin();
            playGame(socket);
        }
    }

});
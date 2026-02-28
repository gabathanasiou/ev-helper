export function setupAutocomplete(inputElement, listElement, dataArray, onSelectCallback) {
    let selectedIndex = -1;

    const showOptions = () => {
        const val = inputElement.value;
        listElement.innerHTML = '';
        listElement.style.display = 'block';
        selectedIndex = -1;

        const matches = val
            ? dataArray.filter(item => item.toLowerCase().includes(val.toLowerCase())).slice(0, 50)
            : dataArray.slice(0, 50);

        if (matches.length === 0) {
            listElement.innerHTML = '<div class="autocomplete-item" style="color: var(--text-muted); pointer-events: none;">No matches found</div>';
            return;
        }

        matches.forEach((match, index) => {
            const b = document.createElement('div');
            b.className = 'autocomplete-item';
            b.setAttribute('data-index', index);

            if (val) {
                const matchIndex = match.toLowerCase().indexOf(val.toLowerCase());
                if (matchIndex >= 0) {
                    const pre = match.slice(0, matchIndex);
                    const hit = match.slice(matchIndex, matchIndex + val.length);
                    const post = match.slice(matchIndex + val.length);

                    b.appendChild(document.createTextNode(pre));
                    const strong = document.createElement('strong');
                    strong.style.color = "var(--primary)";
                    strong.textContent = hit;
                    b.appendChild(strong);
                    b.appendChild(document.createTextNode(post));
                } else {
                    b.textContent = match;
                }
            } else {
                b.textContent = match;
            }

            b.addEventListener('click', () => {
                inputElement.value = match;
                listElement.innerHTML = '';
                listElement.style.display = 'none';
                onSelectCallback(match);
            });
            listElement.appendChild(b);
        });
    };

    const updateSelection = (items) => {
        items.forEach((item, index) => {
            if (index === selectedIndex) {
                item.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.style.backgroundColor = '';
            }
        });
    };

    inputElement.addEventListener('keydown', (e) => {
        const items = listElement.querySelectorAll('.autocomplete-item');
        if (items.length === 0 || listElement.style.display === 'none') return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex++;
            if (selectedIndex >= items.length) selectedIndex = items.length - 1;
            updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex--;
            if (selectedIndex < 0) selectedIndex = 0;
            updateSelection(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < items.length) {
                items[selectedIndex].click();
            } else if (items.length > 0 && selectedIndex === -1 && inputElement.value !== '') {
                // Let's just click the first one if they hit enter without moving arrows
                items[0].click();
            }
        }
    });

    inputElement.addEventListener('input', showOptions);
    inputElement.addEventListener('focus', showOptions);

    // Close list if clicked outside
    document.addEventListener('click', function (e) {
        if (e.target !== inputElement) {
            listElement.style.display = 'none';
        }
    });
}

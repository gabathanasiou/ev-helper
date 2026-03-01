import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import isEqual from 'lodash.isequal';
import { Box, useInput } from 'ink';
import { Indicator, Item as ItemComponent } from 'ink-select-input';

function arrayRotate(input, n) {
    if (!Array.isArray(input)) return [];
    const x = input.slice();
    const num = typeof n === 'number' ? n : 0;
    return x.splice(-num % x.length).concat(x);
}

function StaticSelectInput({
    items = [],
    isFocused = true,
    initialIndex = 0,
    indicatorComponent = Indicator,
    itemComponent = ItemComponent,
    limit: customLimit,
    onSelect,
    onHighlight
}) {
    const hasLimit = typeof customLimit === 'number' && items.length > customLimit;
    const limit = hasLimit ? Math.min(customLimit, items.length) : items.length;

    const [selectedIndex, setSelectedIndex] = useState(0);
    const [rotateIndex, setRotateIndex] = useState(0);

    const previousItems = useRef(items);

    useEffect(() => {
        if (!isEqual(previousItems.current.map(item => item.value), items.map(item => item.value))) {
            setRotateIndex(0);
            setSelectedIndex(0);
        }
        previousItems.current = items;
    }, [items]);

    useEffect(() => {
        if (typeof initialIndex === 'number' && initialIndex >= 0 && initialIndex < items.length) {
            if (hasLimit) {
                const maxRotate = items.length - limit;
                const r = Math.min(initialIndex, maxRotate);
                setRotateIndex(-r);
                setSelectedIndex(initialIndex - r);
            } else {
                setSelectedIndex(initialIndex);
            }
        }
    }, [initialIndex]);

    useInput(useCallback((input, key) => {
        const totalItems = items.length;
        if (totalItems === 0) return;

        const absoluteIndex = (totalItems - rotateIndex + selectedIndex) % totalItems;

        if (key.upArrow) {
            if (absoluteIndex === 0) {
                if (hasLimit) {
                    setRotateIndex(-(totalItems - limit));
                    setSelectedIndex(limit - 1);
                } else {
                    setSelectedIndex(totalItems - 1);
                }
            } else {
                if (selectedIndex === 0 && hasLimit) {
                    setRotateIndex(prev => prev + 1);
                } else {
                    setSelectedIndex(prev => prev - 1);
                }
            }
        }

        if (key.downArrow) {
            if (absoluteIndex === totalItems - 1) {
                setRotateIndex(0);
                setSelectedIndex(0);
            } else {
                if (selectedIndex === limit - 1 && hasLimit) {
                    setRotateIndex(prev => prev - 1);
                } else {
                    setSelectedIndex(prev => prev + 1);
                }
            }
        }

        if (key.return || key.enter || key.rightArrow) {
            const slicedItems = hasLimit
                ? arrayRotate(items, rotateIndex).slice(0, limit)
                : items;
            if (typeof onSelect === 'function') {
                onSelect(slicedItems[selectedIndex]);
            }
        }
    }, [
        hasLimit,
        limit,
        rotateIndex,
        selectedIndex,
        items,
        onSelect,
        onHighlight
    ]), { isActive: isFocused });

    useEffect(() => {
        if (items.length > 0 && typeof onHighlight === 'function') {
            const slicedItems = hasLimit
                ? arrayRotate(items, rotateIndex).slice(0, limit)
                : items;
            onHighlight(slicedItems[selectedIndex]);
        }
    }, [rotateIndex, selectedIndex, items, hasLimit, limit, onHighlight]);

    const slicedItems = hasLimit
        ? arrayRotate(items, rotateIndex).slice(0, limit)
        : items;

    return (
        <Box flexDirection="column">
            {slicedItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                    <Box key={item.key ?? (item.value + index)} height={1}>
                        {indicatorComponent && React.createElement(indicatorComponent, { isSelected })}
                        {itemComponent && React.createElement(itemComponent, { ...item, isSelected })}
                    </Box>
                );
            })}
        </Box>
    );
}

export default StaticSelectInput;
